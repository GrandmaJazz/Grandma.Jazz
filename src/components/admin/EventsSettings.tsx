'use client';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router, Route, Switch } from 'wouter';
import { control } from './SettingsUI';
import Dashboard from './events/manage/Dashboard';
import EventsList from './events/manage/EventsList';
import EventEdit from './events/manage/EventEdit';
import Attendees from './events/manage/Attendees';
import CheckIn from './events/manage/CheckIn';
import { SettingsPage, TeamPage } from './events/manage/TeamSettings';
export default function EventsSettings() {
 const [client]=useState(()=>new QueryClient({defaultOptions:{queries:{retry:1,refetchOnWindowFocus:false}}}));
 const [path,setPath]=useState('/events/manage/settings');
 const usePanelLocation=():[string,(to:string)=>void]=>[path,setPath];
 return <QueryClientProvider client={client}><Router hook={usePanelLocation}><div className="native-events space-y-5">
 <nav aria-label="Event management" className="flex flex-wrap gap-2">{[
 ['/events/manage','Overview'],['/events/manage/events','Events'],['/events/manage/events/new','Create event'],['/events/manage/settings','Apple passes & messaging'],['/events/manage/team','Team'],
 ].map(([to,label])=><button key={to} type="button" className={control} aria-pressed={path===to} onClick={()=>setPath(to)}>{label}</button>)}</nav>
 <Switch><Route path="/events/manage/events/new" component={EventEdit} /><Route path="/events/manage/events/:eventId/attendees" component={Attendees}/><Route path="/events/manage/events/:eventId/check-in" component={CheckIn}/><Route path="/events/manage/events/:eventId" component={EventEdit}/><Route path="/events/manage/events" component={EventsList}/><Route path="/events/manage/settings" component={SettingsPage}/><Route path="/events/manage/team" component={TeamPage}/><Route path="/events/manage" component={Dashboard}/><Route><p>Select an Events section above.</p></Route></Switch>
 </div></Router></QueryClientProvider>;
}
