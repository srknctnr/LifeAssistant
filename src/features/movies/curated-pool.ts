// Curated pool of widely acclaimed films (IMDb ids) used by the OMDb-only
// discover mode. Genres use the app's canonical Turkish names so the taste
// profile can rank the pool without any network calls; details (poster,
// rating) are fetched from OMDb only for the picked few. A wrong/retired id
// degrades gracefully: the OMDb lookup fails and the entry is skipped.

export interface CuratedMovie {
  imdbId: string
  title: string
  genres: string[]
}

export const CURATED_POOL: CuratedMovie[] = [
  { imdbId: 'tt0111161', title: 'The Shawshank Redemption', genres: ['Dram'] },
  { imdbId: 'tt0068646', title: 'The Godfather', genres: ['Suç', 'Dram'] },
  {
    imdbId: 'tt0468569',
    title: 'The Dark Knight',
    genres: ['Aksiyon', 'Suç', 'Dram'],
  },
  { imdbId: 'tt0050083', title: '12 Angry Men', genres: ['Dram'] },
  { imdbId: 'tt0108052', title: "Schindler's List", genres: ['Dram', 'Tarih'] },
  {
    imdbId: 'tt0167260',
    title: 'The Lord of the Rings: The Return of the King',
    genres: ['Macera', 'Fantastik'],
  },
  { imdbId: 'tt0110912', title: 'Pulp Fiction', genres: ['Suç', 'Dram'] },
  {
    imdbId: 'tt0120737',
    title: 'The Lord of the Rings: The Fellowship of the Ring',
    genres: ['Macera', 'Fantastik'],
  },
  {
    imdbId: 'tt0060196',
    title: 'The Good, the Bad and the Ugly',
    genres: ['Western', 'Macera'],
  },
  { imdbId: 'tt0109830', title: 'Forrest Gump', genres: ['Dram', 'Romantik'] },
  { imdbId: 'tt0137523', title: 'Fight Club', genres: ['Dram'] },
  {
    imdbId: 'tt1375666',
    title: 'Inception',
    genres: ['Aksiyon', 'Bilim Kurgu', 'Gerilim'],
  },
  {
    imdbId: 'tt0133093',
    title: 'The Matrix',
    genres: ['Aksiyon', 'Bilim Kurgu'],
  },
  { imdbId: 'tt0099685', title: 'Goodfellas', genres: ['Suç', 'Dram'] },
  { imdbId: 'tt0114369', title: 'Se7en', genres: ['Suç', 'Dram', 'Gizem'] },
  {
    imdbId: 'tt0102926',
    title: 'The Silence of the Lambs',
    genres: ['Suç', 'Dram', 'Gerilim'],
  },
  {
    imdbId: 'tt0816692',
    title: 'Interstellar',
    genres: ['Macera', 'Dram', 'Bilim Kurgu'],
  },
  {
    imdbId: 'tt0120815',
    title: 'Saving Private Ryan',
    genres: ['Dram', 'Savaş'],
  },
  {
    imdbId: 'tt0245429',
    title: 'Spirited Away',
    genres: ['Animasyon', 'Macera', 'Aile'],
  },
  { imdbId: 'tt6751668', title: 'Parasite', genres: ['Dram', 'Gerilim'] },
  {
    imdbId: 'tt0110413',
    title: 'Léon: The Professional',
    genres: ['Aksiyon', 'Suç', 'Dram'],
  },
  {
    imdbId: 'tt0120689',
    title: 'The Green Mile',
    genres: ['Suç', 'Dram', 'Fantastik'],
  },
  {
    imdbId: 'tt0034583',
    title: 'Casablanca',
    genres: ['Dram', 'Romantik', 'Savaş'],
  },
  {
    imdbId: 'tt0047478',
    title: 'Seven Samurai',
    genres: ['Aksiyon', 'Dram', 'Macera'],
  },
  { imdbId: 'tt0078748', title: 'Alien', genres: ['Korku', 'Bilim Kurgu'] },
  { imdbId: 'tt0081505', title: 'The Shining', genres: ['Korku', 'Dram'] },
  { imdbId: 'tt0070047', title: 'The Exorcist', genres: ['Korku'] },
  {
    imdbId: 'tt7784604',
    title: 'Hereditary',
    genres: ['Korku', 'Gizem', 'Gerilim'],
  },
  { imdbId: 'tt0209144', title: 'Memento', genres: ['Gizem', 'Gerilim'] },
  {
    imdbId: 'tt0082971',
    title: 'Raiders of the Lost Ark',
    genres: ['Aksiyon', 'Macera'],
  },
  {
    imdbId: 'tt0407887',
    title: 'The Departed',
    genres: ['Suç', 'Dram', 'Gerilim'],
  },
  {
    imdbId: 'tt0482571',
    title: 'The Prestige',
    genres: ['Dram', 'Gizem', 'Bilim Kurgu'],
  },
  {
    imdbId: 'tt0172495',
    title: 'Gladiator',
    genres: ['Aksiyon', 'Macera', 'Dram'],
  },
  {
    imdbId: 'tt0114814',
    title: 'The Usual Suspects',
    genres: ['Suç', 'Gizem', 'Gerilim'],
  },
  {
    imdbId: 'tt0088763',
    title: 'Back to the Future',
    genres: ['Macera', 'Komedi', 'Bilim Kurgu'],
  },
  {
    imdbId: 'tt0103064',
    title: 'Terminator 2: Judgment Day',
    genres: ['Aksiyon', 'Bilim Kurgu'],
  },
  { imdbId: 'tt0317248', title: 'City of God', genres: ['Suç', 'Dram'] },
  {
    imdbId: 'tt0118799',
    title: 'Life Is Beautiful',
    genres: ['Komedi', 'Dram', 'Romantik'],
  },
  {
    imdbId: 'tt0076759',
    title: 'Star Wars',
    genres: ['Aksiyon', 'Macera', 'Bilim Kurgu'],
  },
  {
    imdbId: 'tt0253474',
    title: 'The Pianist',
    genres: ['Dram', 'Müzik', 'Savaş'],
  },
  {
    imdbId: 'tt0095765',
    title: 'Cinema Paradiso',
    genres: ['Dram', 'Romantik'],
  },
  {
    imdbId: 'tt0910970',
    title: 'WALL·E',
    genres: ['Animasyon', 'Macera', 'Aile', 'Bilim Kurgu'],
  },
  {
    imdbId: 'tt1853728',
    title: 'Django Unchained',
    genres: ['Dram', 'Western'],
  },
  {
    imdbId: 'tt0993846',
    title: 'The Wolf of Wall Street',
    genres: ['Komedi', 'Suç', 'Dram'],
  },
  { imdbId: 'tt2582802', title: 'Whiplash', genres: ['Dram', 'Müzik'] },
  { imdbId: 'tt7286456', title: 'Joker', genres: ['Suç', 'Dram', 'Gerilim'] },
  {
    imdbId: 'tt0361748',
    title: 'Inglourious Basterds',
    genres: ['Macera', 'Dram', 'Savaş'],
  },
  {
    imdbId: 'tt0364569',
    title: 'Oldboy',
    genres: ['Aksiyon', 'Dram', 'Gizem'],
  },
  { imdbId: 'tt1049413', title: 'Up', genres: ['Animasyon', 'Macera', 'Aile'] },
  {
    imdbId: 'tt2380307',
    title: 'Coco',
    genres: ['Animasyon', 'Macera', 'Aile', 'Müzik'],
  },
  {
    imdbId: 'tt0266543',
    title: 'Finding Nemo',
    genres: ['Animasyon', 'Macera', 'Aile'],
  },
  {
    imdbId: 'tt0107290',
    title: 'Jurassic Park',
    genres: ['Macera', 'Bilim Kurgu', 'Gerilim'],
  },
  {
    imdbId: 'tt0119217',
    title: 'Good Will Hunting',
    genres: ['Dram', 'Romantik'],
  },
  {
    imdbId: 'tt2278388',
    title: 'The Grand Budapest Hotel',
    genres: ['Macera', 'Komedi', 'Suç'],
  },
  { imdbId: 'tt0118715', title: 'The Big Lebowski', genres: ['Komedi', 'Suç'] },
  {
    imdbId: 'tt0107048',
    title: 'Groundhog Day',
    genres: ['Komedi', 'Fantastik', 'Romantik'],
  },
  {
    imdbId: 'tt0338013',
    title: 'Eternal Sunshine of the Spotless Mind',
    genres: ['Dram', 'Romantik', 'Bilim Kurgu'],
  },
  { imdbId: 'tt1160419', title: 'Dune', genres: ['Bilim Kurgu', 'Macera'] },
  {
    imdbId: 'tt15398776',
    title: 'Oppenheimer',
    genres: ['Biyografi', 'Dram', 'Tarih'],
  },
  {
    imdbId: 'tt6710474',
    title: 'Everything Everywhere All at Once',
    genres: ['Aksiyon', 'Macera', 'Komedi', 'Bilim Kurgu'],
  },
]
