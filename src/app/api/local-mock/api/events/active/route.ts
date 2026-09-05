// Local-dev-only mock for GET /api/events/active, backing the homepage EventBooking section.
export async function GET() {
  return Response.json({
    _id: 'mock-event-1',
    title: 'Live at Grandma Jazz',
    description: 'An evening of live jazz, coffee, and good company.',
    eventDate: new Date().toISOString(),
    eventTime: '19:00',
    ticketPrice: 500,
    videoPath: 'http://localhost:3000/videos/event-background.mp4',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}
