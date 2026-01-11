export function generatePairs(responses){
  const shuffled = [...responses].sort(() => Math.random() - 0.5);
  const pairs = [];
  for(let i=0;i<shuffled.length;i+=2){
    if(shuffled[i+1]){
      pairs.push({
        id: crypto.randomUUID(),
        members: [shuffled[i].id, shuffled[i+1].id],
        createdAt: Date.now()
      });
    }
  }
  return pairs;
}
