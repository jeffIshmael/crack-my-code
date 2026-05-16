const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const address = '0x6118b3B7d85385dFa6D4549CfA9B74400FC2f3E8';
  console.log(`Checking games for address: ${address}`);
  
  const games = await prisma.game.findMany({
    where: {
      OR: [
        { player1Address: address },
        { player2Address: address }
      ]
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 10
  });

  console.log(JSON.stringify(games, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
