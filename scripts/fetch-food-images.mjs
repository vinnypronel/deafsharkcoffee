import fs from 'node:fs';
import https from 'node:https';

const downloads = [
  {
    url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&auto=format&fit=crop&q=80',
    path: 'public/food-artisan-breakfast.jpg'
  },
  {
    url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&auto=format&fit=crop&q=80',
    path: 'public/food-breakfast-croissant.jpg'
  },
  {
    url: 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=800&auto=format&fit=crop&q=80',
    path: 'public/food-maple-waffle.jpg'
  },
  {
    url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&auto=format&fit=crop&q=80',
    path: 'public/food-shark-cubano.jpg'
  },
  {
    url: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=800&auto=format&fit=crop&q=80',
    path: 'public/food-chicken-sandwich.jpg'
  },
  {
    url: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=800&auto=format&fit=crop&q=80',
    path: 'public/food-emilia.jpg'
  },
  {
    url: 'https://images.unsplash.com/photo-1619860860774-1e2e17343432?w=800&auto=format&fit=crop&q=80',
    path: 'public/food-turkey-pesto.jpg'
  },
  {
    url: 'https://images.unsplash.com/photo-1554433607-66b5efe9d304?w=800&auto=format&fit=crop&q=80',
    path: 'public/food-la-toscana.jpg'
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Cooking_a_cachapa.jpg/800px-Cooking_a_cachapa.jpg',
    path: 'public/food-cachapa.jpg'
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Teque%C3%B1os_v%C3%A9n%C3%A9zu%C3%A9liens_%C3%A0_Arepado_%28Lyon%29%2C_avril_2019_%282%29.jpg/800px-Teque%C3%B1os_v%C3%A9n%C3%A9zu%C3%A9liens_%C3%A0_Arepado_%28Lyon%29%2C_avril_2019_%282%29.jpg',
    path: 'public/food-tequenos.jpg'
  },
  {
    url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80',
    path: 'public/food-cachitos.jpg'
  },
  {
    url: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=800&auto=format&fit=crop&q=80',
    path: 'public/food-fries.jpg'
  }
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed with status ${res.statusCode} on ${url}`));
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          console.log(`Saved ${dest}`);
          resolve();
        });
      });
    });
    req.on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  for (const item of downloads) {
    try {
      await download(item.url, item.path);
    } catch (err) {
      console.error(`Error downloading ${item.path}:`, err.message);
    }
  }
}

main();
