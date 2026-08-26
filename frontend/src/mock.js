// ---- MOCK DATA for Juan Maulana / Koda writing showcase ----
// All of this is placeholder content stored client-side.
// Later this will be replaced by real backend data.

export const OWNER = {
  name: "Juan Maulana",
  alias: "Koda",
  aliasNote: "This is the counterpart of Juan — he is the one who writes.",
};

export const WRITINGS = [
  {
    id: "w1",
    category: "Novel",
    title: "The Cartographer of Silence",
    date: "2025 — in progress",
    meta: "Chapter one, excerpt",
    body: "Aru drew maps of places that made no sound. Not quiet places — silent ones, where even memory kept its shoes off. The commission arrived on a Tuesday: chart the old radio station on the hill, the one that stopped broadcasting the night his mother left. He packed a compass, three pencils, and the kind of courage that only looks like courage from far away. The gate was open. The gate was always open. That was the first thing he wrote down.",
  },
  {
    id: "w2",
    category: "Novel",
    title: "Rain Over Batavia",
    date: "2024",
    meta: "Prologue, excerpt",
    body: "The city learned to breathe underwater long before the floods came. Every November the canals rehearsed their old Dutch names, and every December they forgot them again. Saskia counted umbrellas from the third-floor window of the archive — forty-one, forty-two — and decided that today, finally, she would open the box her grandfather had labeled DO NOT OPEN UNTIL THE RAIN STOPS. It had been raining for nine years.",
  },
  {
    id: "w3",
    category: "Short Story",
    title: "The Last Train to Lembang",
    date: "March 2025",
    meta: "Complete — 3,200 words",
    body: "There has never been a train to Lembang. Everyone in the station knew this, which is why nobody questioned the ticket in Dimas's hand, printed on paper that smelled like his father's jacket. Platform 9 did not exist either, but grief is an excellent engineer. The conductor checked his ticket, nodded, and said the thing conductors always say to the recently bereaved: mind the gap.",
  },
  {
    id: "w4",
    category: "Short Story",
    title: "Paper Boats",
    date: "January 2025",
    meta: "Complete — 1,800 words",
    body: "We raced paper boats in the gutter every monsoon, my brother and I, and every year his boat won because he folded his out of pages from books he had already finished, and I folded mine out of homework I refused to do. Paper remembers what was written on it, he said. Words about journeys travel farther. The year he got sick, I folded a boat from a blank page. It refused to float. I have been writing on every page since.",
  },
  {
    id: "w5",
    category: "Poetry",
    title: "Ashfall",
    date: "May 2025",
    meta: "Poem",
    body: "The mountain cleared its throat\nand the whole town went grey and holy —\nlaundry lines like prayer flags,\nmotorbikes wearing veils of dust.\n\nMy grandmother swept the porch twice,\nnot because it helped\nbut because sweeping\nis a language the sky understands:\n\nwe are still here,\nwe are still here,\nsend rain.",
  },
  {
    id: "w6",
    category: "Poetry",
    title: "Monsoon Arithmetic",
    date: "February 2025",
    meta: "Poem",
    body: "Count the seconds between lightning\nand the answer:\nthat is how far away the sky is\nfrom keeping its promises.\n\nCount the buckets in the hallway:\nthat is how many songs\nthe roof knows by heart.\n\nCount the times you said\nI'll leave when the rain stops —\nthat is the number\nof reasons you stayed.",
  },
  {
    id: "w7",
    category: "Journal",
    title: "Notes from a Tuesday",
    date: "June 2025",
    meta: "Journal entry",
    body: "Woke up at six to write and instead watched the neighbor's cat conduct an orchestra of pigeons. Made coffee. Made a second coffee to apologize to the first one. The novel is stuck at the part where something has to happen, which is unfortunate, because I specialize in the parts where nothing does. Wrote 400 words anyway. Deleted 300. The remaining 100 might be the best thing I've done all month. Tuesday: won on points.",
  },
  {
    id: "w8",
    category: "Journal",
    title: "On Writing at 3 AM",
    date: "April 2025",
    meta: "Journal entry",
    body: "Everyone romanticizes writing at 3 AM, and everyone is correct. At 3 AM the inner critic is asleep and the sentences come out wearing pajamas, honest and unbrushed. Koda does his best work at this hour — I just hold the pen. In the morning I read what we wrote and I don't recognize half of it, which is exactly the point. You cannot surprise a reader if you have never once surprised yourself.",
  },
];

export const KIND_WORDS = [
  {
    id: "k1",
    quote: "Juan writes the way rain sounds on a tin roof — you don't realize you've been listening for an hour until it stops.",
    name: "Sarah Wijaya",
    role: "Editor, Arus Literary",
  },
  {
    id: "k2",
    quote: "Paper Boats broke me in eighteen hundred words. I have read novels that tried for four hundred pages and got nowhere near.",
    name: "Daniel Chen",
    role: "Reader & book blogger",
  },
  {
    id: "k3",
    quote: "His journals are proof that an ordinary Tuesday, honestly observed, beats an extraordinary plot lazily told.",
    name: "Ayu Prameswari",
    role: "Writing workshop mentor",
  },
  {
    id: "k4",
    quote: "There are two writers in there — Juan and Koda — and I genuinely cannot tell which one keeps making me cry on public transport.",
    name: "Marcus Tan",
    role: "Fellow writer",
  },
];

export const ABOUT_PAGES = [
  {
    id: "a1",
    heading: "Hello, I'm Juan.",
    sub: "Writer of quiet things",
    body: "I write novels, short stories, poems and journals from a small desk that faces a wall, because windows are a distraction and walls are excellent listeners. My work is about ordinary people carrying extraordinary weather inside them — monsoons, ashfall, the occasional impossible train.",
  },
  {
    id: "a2",
    heading: "Who is Koda?",
    sub: "The counterpart",
    body: "Koda is the counterpart of Juan — he is the one who writes. Juan buys the coffee, answers the emails, misses the deadlines. Koda shows up at 3 AM, borrows Juan's hands, and leaves pages behind like footprints. Neither of us fully trusts the other. The work is better for it.",
  },
  {
    id: "a3",
    heading: "What I write",
    sub: "Four notebooks, one desk",
    body: "Novels — long weather systems that take years to pass. Short stories — single storms, gone by morning. Poetry — the lightning itself. Journals — the smell of the ground after. Everything here is a field log of the same country, mapped in different scales.",
  },
  {
    id: "a4",
    heading: "Say hello",
    sub: "The desk is always open",
    body: "For commissions, collaborations, or to argue about semicolons:",
    links: [
      { label: "hello@juanmaulana.id", kind: "email" },
      { label: "@kodawrites", kind: "instagram" },
      { label: "koda.substack.com", kind: "newsletter" },
    ],
  },
];

export const NOTEBOOKS = [
  {
    slug: "about",
    variant: "orange",
    label: "About me",
    subtitle: ["Graph Paper Memo Book", "Expedition Orange / Written in Indonesia"],
  },
  {
    slug: "writings",
    variant: "paper",
    label: "Writings",
    subtitle: ["Graph Paper Memo Book", "Custom / Written in Indonesia"],
  },
  {
    slug: "kind-words",
    variant: "blue",
    label: "Kind words",
    subtitle: ["Graph Paper Memo Book", "Custom / Written in Indonesia"],
  },
];
