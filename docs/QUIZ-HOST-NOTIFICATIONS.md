# Private quiz host notifications

The owner receives one private email after a new confirmed Quiz Session booking and a Saturday 11:00 Asia/Bangkok roster with the confirmed attendee list and count for that afternoon. Late bookings continue to trigger individual alerts. The roster records its snapshot time and links to the authenticated live list for later changes. A Saturday restart catches up before the event starts; a past event never creates a late roster.

Use the chosen Family name/tile matched by exact normalized email. The shared identity helper selects the most recently chosen active identity; tied/undated conflicts and missing matches retain the booking name. Never infer identity from a similar name or remove email aliases. Contact email addresses are not printed in the notification.

## Independent .com mailbox

Set QUIZ_HOST_EMAIL_MODE=smtp, QUIZ_HOST_EMAIL_TO=grandmajazzphuket@gmail.com, QUIZ_HOST_SMTP_HOST=smtp.gmail.com, QUIZ_HOST_SMTP_PORT=465, QUIZ_HOST_SMTP_USER to the authenticated .com mailbox, and QUIZ_HOST_SMTP_PASSWORD privately. A Google app password must be created by the owner in the correct mailbox account, never copied into chat, Git or logs. Verify SMTP authentication without sending first, then send one clearly fictional setup message to the approved owner address. Enable host delivery only after verification.

Host delivery is independent of EVENTS_EMAIL_MODE. Keep guest event delivery disabled and do not drain or replay the customer backlog. New quiz bookings do not enqueue guest confirmation mail; their ticket opens in the browser with Apple Wallet and phone/Google calendar options. Non-quiz behavior is preserved. The existing Mailchimp Family welcome/followup remains separate. Brad's retired Resend service is not a host transport.

The durable outbox row is inserted in the same transaction as registration/ticket creation. Unique dedupe keys prevent repeated booking alerts and repeated roster jobs. SMTP uses TLS, one explicit approved envelope recipient and a stable Message-ID. Known delivery failures receive bounded retry/backoff. Uncertain DATA acceptance and stale in-flight rows are held after the maximum attempt count: inspect the mailbox Sent folder using the stable Message-ID before manually retrying, rather than risk a duplicate.

No message is sent when the host mode is disabled. Fixture tests use an isolated in-memory PostgreSQL implementation and a fake SMTP client; they never write production data or deliver real guest mail. Physical inbox receipt and the first scheduled Saturday run remain live acceptance checks.
