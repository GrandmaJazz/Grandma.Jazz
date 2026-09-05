// Local-dev-only mock for GET /api/cards, backing the homepage hero card carousel.
export async function GET() {
  return Response.json({
    success: true,
    cards: [
      {
        _id: 'mock-card-1',
        title: 'Grandma Jazz',
        description: 'Plastic-free cannabis café in Kamala, Phuket',
        imagePath: 'http://localhost:3000/images/ourstory.webp',
        order: 0,
        music: [],
      },
    ],
  });
}
