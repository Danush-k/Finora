/**
 * Intelligent, Predictive & Fuzzy Search Engine for Finora
 * Supports:
 * - Token-based order-independent matching ("Premnath Metro" -> "PREMNATH A (Metro Cafe)")
 * - Fuzzy typo tolerance ("Metor" -> "Metro", "Met Cafe" -> "Metro Cafe")
 * - Substring and prefix matching ("Met" -> "Metro Cafe")
 * - Attribute-wide scoring (merchant, description, category, reference number, amount, payment method)
 * - Intelligent match segment highlighting
 * - Recent searches management with localStorage persistence
 */

export interface HighlightSegment {
  text: string;
  isHighlighted: boolean;
}

export interface MerchantSuggestion {
  type: "MERCHANT";
  id: string;
  name: string;
  cleanName: string;
  category: string;
  transactionCount: number;
  totalSpent: number;
  score: number;
  highlightSegments: HighlightSegment[];
}

export interface TransactionSuggestion {
  type: "TRANSACTION";
  id: string;
  merchant: string;
  category: string;
  date: string;
  amount: number;
  transactionType: "EXPENSE" | "INCOME" | "REFUND" | "TRANSFER";
  paymentMethod: string;
  referenceNumber?: string;
  score: number;
  highlightSegments: HighlightSegment[];
}

export interface RecentSearchItem {
  type: "RECENT";
  query: string;
  timestamp: number;
}

export interface CategorizedSearchResults {
  recentSearches: RecentSearchItem[];
  merchants: MerchantSuggestion[];
  transactions: TransactionSuggestion[];
  hasResults: boolean;
}

// ============================================================================
// FUZZY DISTANCE ALGORITHM (Damerau-Levenshtein with Transposition Support)
// ============================================================================

export function levenshteinDistance(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  const matrix: number[][] = [];
  for (let i = 0; i <= al; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= bl; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );

      // Transposition check (e.g. "te" -> "et" as in "Metor" vs "Metro")
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + cost);
      }
    }
  }

  return matrix[al][bl];
}

/**
 * Returns true if query token matches target token via prefix, substring, or fuzzy typo
 */
function isFuzzyTokenMatch(
  queryToken: string,
  targetToken: string
): { isMatch: boolean; score: number; matchSpan?: [number, number] } {
  const q = queryToken.toLowerCase();
  const t = targetToken.toLowerCase();

  // 1. Exact match
  if (q === t) {
    return { isMatch: true, score: 100, matchSpan: [0, t.length] };
  }

  // 2. Prefix match (e.g. "met" -> "metro")
  if (t.startsWith(q)) {
    return { isMatch: true, score: 85, matchSpan: [0, q.length] };
  }

  // 3. Substring match
  const subIdx = t.indexOf(q);
  if (subIdx !== -1) {
    return { isMatch: true, score: 70, matchSpan: [subIdx, subIdx + q.length] };
  }

  // 4. Fuzzy typo tolerance (only for tokens of length >= 3)
  if (q.length >= 3 && t.length >= 3) {
    const maxDistance = q.length <= 4 ? 1 : 2;
    const dist = levenshteinDistance(q, t);
    if (dist <= maxDistance) {
      return { isMatch: true, score: 55 - dist * 10, matchSpan: [0, Math.min(q.length, t.length)] };
    }

    // Prefix fuzzy (e.g. "metor" query against "metrocafe" word)
    const tSub = t.slice(0, q.length + 1);
    const subDist = levenshteinDistance(q, tSub);
    if (subDist <= 1) {
      return { isMatch: true, score: 50, matchSpan: [0, tSub.length] };
    }
  }

  return { isMatch: false, score: 0 };
}

// ============================================================================
// HIGHLIGHTING ENGINE
// ============================================================================

export function generateHighlightSegments(
  sourceText: string,
  query: string
): HighlightSegment[] {
  if (!sourceText) return [];
  if (!query || !query.trim()) {
    return [{ text: sourceText, isHighlighted: false }];
  }

  const cleanQuery = query.trim().toLowerCase();
  const tokens = cleanQuery.split(/\s+/).filter((t) => t.length > 0);
  if (tokens.length === 0) {
    return [{ text: sourceText, isHighlighted: false }];
  }

  const textLower = sourceText.toLowerCase();
  const matchedIntervals: [number, number][] = [];

  // 1. Check if the full query matches as a contiguous substring first
  let fullIdx = textLower.indexOf(cleanQuery);
  while (fullIdx !== -1) {
    matchedIntervals.push([fullIdx, fullIdx + cleanQuery.length]);
    fullIdx = textLower.indexOf(cleanQuery, fullIdx + cleanQuery.length);
  }

  // 2. Token-by-token matching across words in sourceText
  const wordRegex = /\b[A-Za-z0-9]+\b/g;
  let wordMatch: RegExpExecArray | null;

  while ((wordMatch = wordRegex.exec(sourceText)) !== null) {
    const word = wordMatch[0];
    const wordStart = wordMatch.index;

    for (const token of tokens) {
      const matchResult = isFuzzyTokenMatch(token, word);
      if (matchResult.isMatch && matchResult.matchSpan) {
        const spanStart = wordStart + matchResult.matchSpan[0];
        const spanEnd = wordStart + matchResult.matchSpan[1];
        matchedIntervals.push([spanStart, Math.min(spanEnd, sourceText.length)]);
      }
    }
  }

  // 3. Fallback: direct substring match for any token
  for (const token of tokens) {
    let tIdx = textLower.indexOf(token);
    while (tIdx !== -1) {
      matchedIntervals.push([tIdx, tIdx + token.length]);
      tIdx = textLower.indexOf(token, tIdx + token.length);
    }
  }

  if (matchedIntervals.length === 0) {
    return [{ text: sourceText, isHighlighted: false }];
  }

  // Merge overlapping intervals
  matchedIntervals.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: [number, number][] = [];
  let current = matchedIntervals[0];

  for (let i = 1; i < matchedIntervals.length; i++) {
    const next = matchedIntervals[i];
    if (next[0] <= current[1]) {
      current[1] = Math.max(current[1], next[1]);
    } else {
      merged.push(current);
      current = next;
    }
  }
  merged.push(current);

  // Generate segments
  const segments: HighlightSegment[] = [];
  let lastIndex = 0;

  for (const [start, end] of merged) {
    if (start > lastIndex) {
      segments.push({
        text: sourceText.slice(lastIndex, start),
        isHighlighted: false,
      });
    }
    if (end > start) {
      segments.push({
        text: sourceText.slice(start, end),
        isHighlighted: true,
      });
    }
    lastIndex = Math.max(lastIndex, end);
  }

  if (lastIndex < sourceText.length) {
    segments.push({
      text: sourceText.slice(lastIndex),
      isHighlighted: false,
    });
  }

  return segments;
}

// ============================================================================
// CORE SCORING & MATCHING ENGINE
// ============================================================================

export interface MatchScoreResult {
  isMatch: boolean;
  score: number;
}

export function scoreTextMatch(sourceText: string, query: string): MatchScoreResult {
  if (!sourceText || !query.trim()) return { isMatch: false, score: 0 };

  const sLower = sourceText.toLowerCase();
  const qLower = query.trim().toLowerCase();

  // 1. Exact match
  if (sLower === qLower) {
    return { isMatch: true, score: 1000 };
  }

  // 2. Starts with full query
  if (sLower.startsWith(qLower)) {
    return { isMatch: true, score: 850 };
  }

  // 3. Contains full query
  if (sLower.includes(qLower)) {
    return { isMatch: true, score: 700 };
  }

  // 4. Token-based matching (handles "Premnath Metro" or "Met Cafe")
  const qTokens = qLower.split(/\s+/).filter(Boolean);
  const words = sLower.split(/[^a-z0-9]+/).filter(Boolean);

  let matchedTokens = 0;
  let totalTokenScore = 0;

  for (const qToken of qTokens) {
    let bestTokenScore = 0;

    for (const word of words) {
      const match = isFuzzyTokenMatch(qToken, word);
      if (match.isMatch && match.score > bestTokenScore) {
        bestTokenScore = match.score;
      }
    }

    if (bestTokenScore > 0) {
      matchedTokens++;
      totalTokenScore += bestTokenScore;
    }
  }

  // If ALL tokens in query matched at least one word
  if (matchedTokens === qTokens.length && qTokens.length > 0) {
    const avgScore = totalTokenScore / qTokens.length;
    return { isMatch: true, score: 450 + avgScore * 2 };
  }

  // If at least 70% of tokens matched in longer queries
  if (qTokens.length > 2 && matchedTokens / qTokens.length >= 0.7) {
    return { isMatch: true, score: 300 + (matchedTokens / qTokens.length) * 100 };
  }

  return { isMatch: false, score: 0 };
}

// ============================================================================
// PREDICTIVE CATEGORIZED SEARCH DISPATCHER
// ============================================================================

export function searchTransactionsAndMerchants(
  query: string,
  allTransactions: any[],
  maxMerchantSuggestions = 5,
  maxTransactionSuggestions = 5
): CategorizedSearchResults {
  const clean = (query || "").trim();
  const recentSearches = getRecentSearches(clean);

  if (!clean) {
    return {
      recentSearches,
      merchants: [],
      transactions: [],
      hasResults: recentSearches.length > 0,
    };
  }

  // 1. Group unique merchants and aggregate their transactions
  const merchantMap = new Map<
    string,
    {
      name: string;
      category: string;
      count: number;
      totalSpent: number;
    }
  >();

  for (const t of allTransactions) {
    const mName = t.merchant ? t.merchant.trim() : "";
    if (!mName) continue;

    if (!merchantMap.has(mName)) {
      merchantMap.set(mName, {
        name: mName,
        category: t.category || "Other",
        count: 0,
        totalSpent: 0,
      });
    }

    const m = merchantMap.get(mName)!;
    m.count += 1;
    if (t.transactionType === "EXPENSE") {
      m.totalSpent += t.amount || 0;
    }
  }

  // 2. Score merchants
  const merchantResults: MerchantSuggestion[] = [];

  merchantMap.forEach((m, mName) => {
    // Score merchant name
    const nameMatch = scoreTextMatch(mName, clean);

    // Also score category (e.g. if searching "Food" and category is "Food & Dining")
    const catMatch = scoreTextMatch(m.category, clean);

    let highestScore = nameMatch.score;
    if (catMatch.score > highestScore) {
      highestScore = Math.max(highestScore, catMatch.score * 0.7);
    }

    if (nameMatch.isMatch || catMatch.isMatch) {
      merchantResults.push({
        type: "MERCHANT",
        id: `merchant-${mName}`,
        name: mName,
        cleanName: mName,
        category: m.category,
        transactionCount: m.count,
        totalSpent: m.totalSpent,
        score: highestScore,
        highlightSegments: generateHighlightSegments(mName, clean),
      });
    }
  });

  // Sort merchants by score descending, then by transaction count
  merchantResults.sort((a, b) => b.score - a.score || b.transactionCount - a.transactionCount);
  const topMerchants = merchantResults.slice(0, maxMerchantSuggestions);

  // 3. Score individual transactions across multiple attributes
  const txnResults: TransactionSuggestion[] = [];

  for (const t of allTransactions) {
    let bestTxnScore = 0;

    // Attributes to check
    const merchantMatch = scoreTextMatch(t.merchant || "", clean);
    const descMatch = scoreTextMatch(t.description || "", clean);
    const refMatch = scoreTextMatch(t.referenceNumber || "", clean);
    const catMatch = scoreTextMatch(t.category || "", clean);
    const methodMatch = scoreTextMatch(t.paymentMethod || "", clean);
    const bankMatch = scoreTextMatch(t.bank || "", clean);

    bestTxnScore = Math.max(
      merchantMatch.score,
      descMatch.score * 0.9,
      refMatch.score * 1.1, // reference number searches are high intent
      catMatch.score * 0.75,
      methodMatch.score * 0.7,
      bankMatch.score * 0.65
    );

    // Amount match
    const cleanNum = clean.replace(/[^0-9.]/g, "");
    if (cleanNum && !isNaN(Number(cleanNum))) {
      const targetAmt = Number(cleanNum);
      if (Math.abs((t.amount || 0) - targetAmt) < 0.01) {
        bestTxnScore = Math.max(bestTxnScore, 800);
      }
    }

    if (bestTxnScore > 0) {
      txnResults.push({
        type: "TRANSACTION",
        id: t.id,
        merchant: t.merchant || "Unknown",
        category: t.category || "Other",
        date: t.transactionDate || "",
        amount: t.amount || 0,
        transactionType: t.transactionType || "EXPENSE",
        paymentMethod: t.paymentMethod || "UPI",
        referenceNumber: t.referenceNumber,
        score: bestTxnScore,
        highlightSegments: generateHighlightSegments(t.merchant || t.description || "", clean),
      });
    }
  }

  // Sort transactions by score descending, then by date descending
  txnResults.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
  const topTransactions = txnResults.slice(0, maxTransactionSuggestions);

  return {
    recentSearches,
    merchants: topMerchants,
    transactions: topTransactions,
    hasResults: topMerchants.length > 0 || topTransactions.length > 0,
  };
}

// ============================================================================
// RECENT SEARCHES (LOCALSTORAGE PERSISTENCE)
// ============================================================================

const RECENT_SEARCHES_KEY = "finora_recent_searches_v2";

export function getRecentSearches(filterQuery = ""): RecentSearchItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const list: RecentSearchItem[] = JSON.parse(raw);
    if (!Array.isArray(list)) return [];

    if (!filterQuery.trim()) {
      return list.slice(0, 5);
    }

    const q = filterQuery.toLowerCase();
    return list.filter((item) => item.query.toLowerCase().includes(q)).slice(0, 4);
  } catch (e) {
    return [];
  }
}

export function saveRecentSearch(query: string) {
  if (typeof window === "undefined") return;
  const clean = (query || "").trim();
  if (clean.length < 2) return;

  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    let list: RecentSearchItem[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];

    // Remove duplicates
    list = list.filter((item) => item.query.toLowerCase() !== clean.toLowerCase());

    // Insert at front
    list.unshift({
      type: "RECENT",
      query: clean,
      timestamp: Date.now(),
    });

    // Keep top 8
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(list.slice(0, 8)));
  } catch (e) {
    console.error("Failed to save recent search", e);
  }
}

export function removeRecentSearch(query: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return;
    let list: RecentSearchItem[] = JSON.parse(raw);
    if (!Array.isArray(list)) return;

    list = list.filter((item) => item.query !== query);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(list));
  } catch (e) {
    console.error("Failed to remove recent search", e);
  }
}

export function clearRecentSearches() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch (e) {
    console.error("Failed to clear recent searches", e);
  }
}
