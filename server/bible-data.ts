import { BibleBook, BibleChapter } from "@shared/schema";

// Sample Bible data - in a real app, this would come from a Bible API or database
const bibleBooks: BibleBook[] = [
  { name: "Genesis", chapters: 50 },
  { name: "Exodus", chapters: 40 },
  { name: "Leviticus", chapters: 27 },
  { name: "Numbers", chapters: 36 },
  { name: "Deuteronomy", chapters: 34 },
  { name: "Joshua", chapters: 24 },
  { name: "Judges", chapters: 21 },
  { name: "Ruth", chapters: 4 },
  { name: "1 Samuel", chapters: 31 },
  { name: "2 Samuel", chapters: 24 },
  { name: "1 Kings", chapters: 22 },
  { name: "2 Kings", chapters: 25 },
  { name: "1 Chronicles", chapters: 29 },
  { name: "2 Chronicles", chapters: 36 },
  { name: "Ezra", chapters: 10 },
  { name: "Nehemiah", chapters: 13 },
  { name: "Esther", chapters: 10 },
  { name: "Job", chapters: 42 },
  { name: "Psalms", chapters: 150 },
  { name: "Proverbs", chapters: 31 },
  { name: "Ecclesiastes", chapters: 12 },
  { name: "Song of Solomon", chapters: 8 },
  { name: "Isaiah", chapters: 66 },
  { name: "Jeremiah", chapters: 52 },
  { name: "Lamentations", chapters: 5 },
  { name: "Ezekiel", chapters: 48 },
  { name: "Daniel", chapters: 12 },
  { name: "Hosea", chapters: 14 },
  { name: "Joel", chapters: 3 },
  { name: "Amos", chapters: 9 },
  { name: "Obadiah", chapters: 1 },
  { name: "Jonah", chapters: 4 },
  { name: "Micah", chapters: 7 },
  { name: "Nahum", chapters: 3 },
  { name: "Habakkuk", chapters: 3 },
  { name: "Zephaniah", chapters: 3 },
  { name: "Haggai", chapters: 2 },
  { name: "Zechariah", chapters: 14 },
  { name: "Malachi", chapters: 4 },
  { name: "Matthew", chapters: 28 },
  { name: "Mark", chapters: 16 },
  { name: "Luke", chapters: 24 },
  { name: "John", chapters: 21 },
  { name: "Acts", chapters: 28 },
  { name: "Romans", chapters: 16 },
  { name: "1 Corinthians", chapters: 16 },
  { name: "2 Corinthians", chapters: 13 },
  { name: "Galatians", chapters: 6 },
  { name: "Ephesians", chapters: 6 },
  { name: "Philippians", chapters: 4 },
  { name: "Colossians", chapters: 4 },
  { name: "1 Thessalonians", chapters: 5 },
  { name: "2 Thessalonians", chapters: 3 },
  { name: "1 Timothy", chapters: 6 },
  { name: "2 Timothy", chapters: 4 },
  { name: "Titus", chapters: 3 },
  { name: "Philemon", chapters: 1 },
  { name: "Hebrews", chapters: 13 },
  { name: "James", chapters: 5 },
  { name: "1 Peter", chapters: 5 },
  { name: "2 Peter", chapters: 3 },
  { name: "1 John", chapters: 5 },
  { name: "2 John", chapters: 1 },
  { name: "3 John", chapters: 1 },
  { name: "Jude", chapters: 1 },
  { name: "Revelation", chapters: 22 }
];

// Sample chapter data - Psalm 23 for demonstration
const sampleChapters: { [key: string]: BibleChapter } = {
  "Psalms-23": {
    book: "Psalms",
    chapter: 23,
    verses: [
      { number: 1, text: "The Lord is my shepherd, I lack nothing." },
      { number: 2, text: "He makes me lie down in green pastures, he leads me beside quiet waters," },
      { number: 3, text: "he refreshes my soul. He guides me along the right paths for his name's sake." },
      { number: 4, text: "Even though I walk through the darkest valley, I will fear no evil, for you are with me; your rod and your staff, they comfort me." },
      { number: 5, text: "You prepare a table before me in the presence of my enemies. You anoint my head with oil; my cup overflows." },
      { number: 6, text: "Surely your goodness and love will follow me all the days of my life, and I will dwell in the house of the Lord forever." }
    ]
  },
  "Psalms-1": {
    book: "Psalms",
    chapter: 1,
    verses: [
      { number: 1, text: "Blessed is the one who does not walk in step with the wicked or stand in the way that sinners take or sit in the company of mockers," },
      { number: 2, text: "but whose delight is in the law of the Lord, and who meditates on his law day and night." },
      { number: 3, text: "That person is like a tree planted by streams of water, which yields its fruit in season and whose leaf does not wither—whatever they do prospers." },
      { number: 4, text: "Not so the wicked! They are like chaff that the wind blows away." },
      { number: 5, text: "Therefore the wicked will not stand in the judgment, nor sinners in the assembly of the righteous." },
      { number: 6, text: "For the Lord watches over the way of the righteous, but the way of the wicked leads to destruction." }
    ]
  },
  "John-3": {
    book: "John",
    chapter: 3,
    verses: [
      { number: 1, text: "Now there was a Pharisee, a man named Nicodemus who was a member of the Jewish ruling council." },
      { number: 2, text: "He came to Jesus at night and said, 'Rabbi, we know that you are a teacher who has come from God. For no one could perform the signs you are doing if God were not with him.'" },
      { number: 3, text: "Jesus replied, 'Very truly I tell you, no one can see the kingdom of God unless they are born again.'" },
      { number: 16, text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life." },
      { number: 17, text: "For God did not send his Son into the world to condemn the world, but to save the world through him." }
    ]
  }
};

export function getBibleBooks(): BibleBook[] {
  return bibleBooks;
}

export function getBibleChapter(book: string, chapter: number): BibleChapter | null {
  const key = `${book}-${chapter}`;
  return sampleChapters[key] || null;
}

export function searchBible(query: string): Array<{ book: string; chapter: number; verse: number; text: string }> {
  const results: Array<{ book: string; chapter: number; verse: number; text: string }> = [];
  const searchLower = query.toLowerCase();
  
  // Search through sample chapters
  Object.values(sampleChapters).forEach(chapter => {
    chapter.verses.forEach(verse => {
      if (verse.text.toLowerCase().includes(searchLower)) {
        results.push({
          book: chapter.book,
          chapter: chapter.chapter,
          verse: verse.number,
          text: verse.text
        });
      }
    });
  });
  
  return results.slice(0, 10); // Limit to 10 results
}
