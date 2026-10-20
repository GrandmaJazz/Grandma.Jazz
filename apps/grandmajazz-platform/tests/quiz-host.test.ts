import { beforeAll, afterAll, beforeEach, test, expect, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
const fixture=vi.hoisted(()=>({database:null as any, smtp:{verify:vi.fn(async()=>true), sendMail:vi.fn(), close:vi.fn()}, createTransport:vi.fn()}));
vi.mock('nodemailer',()=>({default:{createTransport:(options:unknown)=>{fixture.createTransport(options);return fixture.smtp;}}}));
vi.mock('../server/db',()=>({pool:{query:(sql:string,params?:unknown[])=>fixture.database.query(sql,params),connect:async()=>({query:(sql:string,params?:unknown[])=>fixture.database.query(sql,params),release:()=>{}})},db:{}}));
vi.mock('../server/events/emails',()=>({enqueueRegistrationConfirmation:vi.fn(async()=>{})}));
import { enqueueRegistrationConfirmation } from '../server/events/emails';
import { registerAttendee } from '../server/events/registrationService';
import { exactFamilyIdentity, renderQuizHostEmail, enqueueSaturdayQuizRosters, saturdayRosterDate } from '../server/events/quizHostNotifications';
import { drainOutbox, deliver } from '../server/events/outboxWorker';
import { eventsConfig } from '../server/events/config';
import { verifyQuizHostSmtp } from '../server/events/quizHostSmtp';

const eventId='11111111-1111-4111-8111-111111111111';
const businessId='22222222-2222-4222-8222-222222222222';
const quiz={id:eventId,business_id:businessId,title:'Quiz Session',slug:'quiz-session-2026-10-24',starts_at:new Date('2026-10-24T09:20:00Z'),timezone:'Asia/Bangkok'};
const members=[{id:'family-1',title:'Sister',name:'Sena',email:Buffer.from('sena@example.invalid').toString('base64')}];
const query=(sql:string,params?:unknown[])=>fixture.database.query(sql,params);
const signup=(overrides={})=>registerAttendee({eventId,fullName:'Registration Name',email:'sena@example.invalid',phone:'+66000000000',termsAccepted:true,ageConfirmed:true,source:'public',...overrides});

beforeAll(async()=>{
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-19T06:00:00Z'));
  process.env.EVENTS_TOKEN_SECRET='fixture-only-no-production-data';
  fixture.database=new PGlite();await fixture.database.waitReady;
  await fixture.database.exec(`
    CREATE TABLE ev_businesses(id uuid PRIMARY KEY,slug text);
    CREATE TABLE ev_events(id uuid PRIMARY KEY,business_id uuid,status text,capacity int,min_age int,registration_opens_at timestamptz,registration_closes_at timestamptz,starts_at timestamptz,title text,slug text,timezone text);
    CREATE TABLE ev_registrations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),business_id uuid,event_id uuid,full_name text,email text,email_normalized text,phone text,phone_normalized text,notes text,terms_accepted_at timestamptz,age_confirmed_at timestamptz,marketing_consent boolean,source text,status text,idempotency_key text,created_by_user_id uuid,created_at timestamptz DEFAULT now());
    CREATE UNIQUE INDEX ev_registrations_idempotency_ux ON ev_registrations(event_id,idempotency_key);
    CREATE UNIQUE INDEX ev_registrations_confirmed_email_ux ON ev_registrations(event_id,email_normalized) WHERE status='confirmed';
    CREATE TABLE ev_tickets(id uuid PRIMARY KEY,business_id uuid,event_id uuid,registration_id uuid,reference text UNIQUE,token_hash text,status text);
    CREATE TABLE family_members(id text,title text,name text,email text,created_at timestamptz DEFAULT now());
    CREATE TABLE family_member_moderation(member_id text,removed_at timestamptz);
    CREATE TABLE ev_email_outbox(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),business_id uuid,event_id uuid,registration_id uuid,template text,recipient text,subject text,html text,text_body text,dedupe_key text UNIQUE,status text DEFAULT 'pending',attempts int DEFAULT 0,next_attempt_at timestamptz DEFAULT now(),sent_at timestamptz,provider_message_id text,last_error text);
  `);
});
beforeEach(async()=>{
  process.env.QUIZ_HOST_EMAIL_MODE='capture';process.env.QUIZ_HOST_EMAIL_TO='owner@example.invalid';eventsConfig.emailMode='disabled';
  process.env.QUIZ_HOST_SMTP_USER='ac@grandmajazz.com';process.env.QUIZ_HOST_SMTP_PASSWORD='fixture-only';
  fixture.smtp.sendMail.mockReset().mockImplementation(async(message:any)=>({accepted:['owner@example.invalid'],messageId:message.messageId}));fixture.createTransport.mockClear();vi.mocked(enqueueRegistrationConfirmation).mockClear();
  await fixture.database.exec('TRUNCATE ev_businesses,ev_events,ev_registrations,ev_tickets,family_members,family_member_moderation,ev_email_outbox');
  await query("INSERT INTO ev_businesses VALUES($1,'grandma-jazz')",[businessId]);
  await query(`INSERT INTO ev_events(id,business_id,status,capacity,min_age,starts_at,title,slug,timezone) VALUES($1,$2,'published',25,21,$3,$4,$5,$6)`,[eventId,businessId,quiz.starts_at,quiz.title,quiz.slug,quiz.timezone]);
  await query('INSERT INTO family_members(id,title,name,email) VALUES($1,$2,$3,$4)',Object.values(members[0]));
});
afterAll(async()=>{vi.useRealTimers();await fixture.database.close();});

test('uses exact normalized email, preserves chosen identity and never guesses an ambiguous match',()=>{
  expect(exactFamilyIdentity('SENA@example.invalid',members)?.displayName).toBe('Sister Sena');
  expect(exactFamilyIdentity('someone@example.invalid',members)).toBeNull();
  expect(exactFamilyIdentity('sena@example.invalid',[...members,{...members[0],id:'2',name:'Other'}])).toBeNull();
  const message=renderQuizHostEmail(quiz,[{full_name:'Ignored Name',email:'sena@example.invalid',reference:'FIX-1'},{full_name:'<script>guest</script>',email:'unknown@example.invalid',reference:'FIX-2'}],members,true);
  expect(message.html).toContain('title=Sister');expect(message.html).toContain('name=Sena');
  expect(message.html).not.toContain('sena@example.invalid');expect(message.html).not.toContain('<script>guest');
  expect(message.html).toContain('&lt;script&gt;guest');expect(message.text).toContain('2 confirmed attendees');
});
test('11:00 Bangkok Saturday boundary is independent of server timezone',()=>{
  expect(saturdayRosterDate(new Date('2026-10-24T03:59:59Z'))).toBeNull();
  expect(saturdayRosterDate(new Date('2026-10-24T04:00:00Z'))).toBe('2026-10-24');
  expect(saturdayRosterDate(new Date('2026-10-25T04:00:00Z'))).toBeNull();
});
test('real registration commits one tile notification and idempotent retry does not duplicate it',async()=>{
  const first=await signup({idempotencyKey:'one-booking'});expect(first.ok).toBe(true);
  const again=await signup({idempotencyKey:'one-booking'});expect(again.ok&&again.duplicate).toBe(true);
  const result=await query('SELECT * FROM ev_email_outbox');expect(result.rows).toHaveLength(1);
  expect(result.rows[0].template).toBe('quiz_host_signup');expect(result.rows[0].recipient).toBe('owner@example.invalid');
  expect(result.rows[0].html).toContain('Sister Sena');
});
test('non-quiz or disabled host notifications do not enqueue; removed family falls back to booking name',async()=>{
  await query("UPDATE ev_events SET slug='another-event'");await signup({email:'nonquiz@example.invalid'});
  expect((await query('SELECT * FROM ev_email_outbox')).rows).toHaveLength(0);
  await query('UPDATE ev_events SET slug=$1',[quiz.slug]);process.env.QUIZ_HOST_EMAIL_MODE='disabled';await signup({email:'second@example.invalid'});
  expect((await query('SELECT * FROM ev_email_outbox')).rows).toHaveLength(0);
  process.env.QUIZ_HOST_EMAIL_MODE='capture';await query("INSERT INTO family_member_moderation VALUES('family-1',now())");
  await signup({idempotencyKey:'removed'});const rows=(await query('SELECT * FROM ev_email_outbox')).rows;
  expect(rows).toHaveLength(1);expect(rows[0].html).toContain('Registration Name');expect(rows[0].html).not.toContain('Sister Sena');
});
test('Saturday list excludes cancellations, totals real bookings, deduplicates ticks and resumes after restart',async()=>{
  await signup();await signup({email:'guest@example.invalid',fullName:'Another Guest'});await signup({email:'cancelled@example.invalid',fullName:'Cancelled Guest'});
  await query("UPDATE ev_registrations SET status='cancelled' WHERE email='cancelled@example.invalid'");
  expect(await enqueueSaturdayQuizRosters(new Date('2026-10-24T03:59:59Z'))).toBe(0);
  await enqueueSaturdayQuizRosters(new Date('2026-10-24T04:00:00Z'));await enqueueSaturdayQuizRosters(new Date('2026-10-24T04:01:00Z'));
  const rows=(await query("SELECT * FROM ev_email_outbox WHERE template='quiz_host_roster'")).rows;
  expect(rows).toHaveLength(1);expect(rows[0].text_body).toContain('2 confirmed attendees');expect(rows[0].text_body).not.toContain('Cancelled Guest');
  await query("DELETE FROM ev_email_outbox WHERE template='quiz_host_roster'");
  expect(await enqueueSaturdayQuizRosters(new Date('2026-10-24T07:00:00Z'))).toBe(1);
  await query("DELETE FROM ev_email_outbox WHERE template='quiz_host_roster'");
  expect(await enqueueSaturdayQuizRosters(new Date('2026-10-24T09:21:00Z'))).toBe(0);
});
test('zero-booking Saturday still sends a useful zero total',async()=>{
  await enqueueSaturdayQuizRosters(new Date('2026-10-24T04:00:00Z'));
  expect((await query('SELECT text_body FROM ev_email_outbox')).rows[0].text_body).toContain('0 confirmed attendees');
});
test('host-only worker leaves every deferred customer email untouched',async()=>{
  await signup();await query("INSERT INTO ev_email_outbox(template,recipient,subject,html,text_body) VALUES('registration_confirmation','customer@example.invalid','deferred','<p>private</p>','deferred')");
  expect((await drainOutbox()).sent).toBe(1);expect((await drainOutbox()).sent).toBe(0);
  const rows=(await query('SELECT template,status,attempts FROM ev_email_outbox ORDER BY template')).rows;
  expect(rows.find((row:any)=>row.template==='registration_confirmation')).toMatchObject({status:'pending',attempts:0});
  expect(rows.find((row:any)=>row.template==='quiz_host_signup').status).toBe('sent');
});
test('host transport uses authenticated .com SMTP, one approved recipient and stable message identifiers',async()=>{
  process.env.QUIZ_HOST_EMAIL_MODE='smtp';
  const row={id:'fixture-outbox',template:'quiz_host_signup',recipient:'owner@example.invalid',subject:'setup fixture',html:'<p>fictional</p>',text_body:'fictional'};
  expect(await deliver(row)).toBe('<quiz-host-fixture-outbox@grandmajazz.com>');
  expect(fixture.createTransport.mock.calls[0][0]).toMatchObject({host:'smtp.gmail.com',secure:true,requireTLS:true,debug:false,tls:{rejectUnauthorized:true}});
  expect(fixture.smtp.sendMail.mock.calls[0][0]).toMatchObject({from:{address:'ac@grandmajazz.com'},to:'owner@example.invalid',envelope:{to:['owner@example.invalid']}});
  await expect(deliver({...row,recipient:'someone-else@example.invalid'})).rejects.toThrow('recipient');
  expect(fixture.smtp.sendMail).toHaveBeenCalledTimes(1);
  await verifyQuizHostSmtp();expect(fixture.smtp.verify).toHaveBeenCalled();
});
test('uncertain SMTP acceptance and stale sending claims are held instead of duplicated',async()=>{
  await signup();process.env.QUIZ_HOST_EMAIL_MODE='smtp';
  fixture.smtp.sendMail.mockRejectedValueOnce({code:'ETIMEDOUT',command:'DATA'});
  expect((await drainOutbox()).failed).toBe(1);
  expect((await query('SELECT status,attempts FROM ev_email_outbox')).rows[0]).toMatchObject({status:'failed',attempts:5});
  expect((await drainOutbox()).sent).toBe(0);expect(fixture.smtp.sendMail).toHaveBeenCalledTimes(1);
  await query("UPDATE ev_email_outbox SET status='sending', attempts=1, next_attempt_at=now()-interval '11 minutes'");
  await drainOutbox();expect((await query('SELECT attempts FROM ev_email_outbox')).rows[0].attempts).toBe(5);
  expect(fixture.smtp.sendMail).toHaveBeenCalledTimes(1);
});
test('retired Resend mode cannot enable or send host alerts',async()=>{
  process.env.QUIZ_HOST_EMAIL_MODE='resend';await signup();
  expect((await query('SELECT * FROM ev_email_outbox')).rows).toHaveLength(0);
  expect((await drainOutbox()).sent).toBe(0);expect(fixture.smtp.sendMail).not.toHaveBeenCalled();
});
test('host tiles follow the latest chosen identity, with tied choices falling back safely',()=>{
  const earlier={...members[0],createdAt:'2025-01-01T00:00:00Z'};
  const later={...members[0],name:'New Choice',createdAt:'2026-01-01T00:00:00Z'};
  expect(exactFamilyIdentity('sena@example.invalid',[earlier,later])?.displayName).toBe('Sister New Choice');
  expect(exactFamilyIdentity('sena@example.invalid',[later,{...earlier,createdAt:later.createdAt}])).toBeNull();
});


test('other businesses never send their attendees to Grandma Jazz',async()=>{
  await query("UPDATE ev_businesses SET slug='another-business'");await signup();
  await enqueueSaturdayQuizRosters(new Date('2026-10-24T04:00:00Z'));
  expect((await query('SELECT * FROM ev_email_outbox')).rows).toHaveLength(0);
});
test('optional Family lookup failure still records the booking and sends the registration name',async()=>{
  await fixture.database.exec('DROP TABLE family_member_moderation');
  try { await signup();expect((await query('SELECT html FROM ev_email_outbox')).rows[0].html).toContain('Registration Name'); }
  finally {await fixture.database.exec('CREATE TABLE family_member_moderation(member_id text,removed_at timestamptz)');}
});

test('quiz guests are not queued for email while other event behavior is preserved',async()=>{
  await signup();expect(enqueueRegistrationConfirmation).not.toHaveBeenCalled();
  process.env.QUIZ_HOST_EMAIL_MODE='disabled';await signup({email:'second@example.invalid'});
  expect(enqueueRegistrationConfirmation).not.toHaveBeenCalled();
  await query("UPDATE ev_events SET slug='another-event'");await signup({email:'third@example.invalid'});
  expect(enqueueRegistrationConfirmation).toHaveBeenCalledTimes(1);
});
