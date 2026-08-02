// AI Classification Engine - Narration-based learning system

import { Category, Transaction } from '@/services/types';

export interface ClassificationRule {
  id: string;
  pattern: string;
  categoryId: string;
  confidence: number;
  matchCount: number;
  createdFrom: 'user' | 'auto';
  lastUsed?: string;
}

export interface ClassificationResult {
  categoryId: string;
  categoryName: string;
  confidence: number;
  reasoning: string;
  alternativeSuggestions: Array<{
    categoryId: string;
    categoryName: string;
    confidence: number;
  }>;
  needsReview: boolean;
}

// Extract keywords from narration
export const extractKeywords = (narration: string): string[] => {
  const stopWords = new Set([
    'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but',
    'in', 'with', 'to', 'from', 'for', 'of', 'by', 'as', 'into', 'through'
  ]);
  
  const words = narration
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
  
  return [...new Set(words)]; // Remove duplicates
};

// Calculate string similarity (Levenshtein distance)
export const calculateSimilarity = (str1: string, str2: string): number => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const costs: number[] = [];
  for (let i = 0; i <= longer.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= shorter.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (longer.charAt(i - 1) !== shorter.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[shorter.length] = lastValue;
  }
  
  return (longer.length - costs[shorter.length]) / longer.length;
};

// Pattern matching with fuzzy logic
export const matchPattern = (narration: string, pattern: string): number => {
  const narrationLower = narration.toLowerCase();
  const patternLower = pattern.toLowerCase();
  
  // Exact match
  if (narrationLower.includes(patternLower)) {
    return 1.0;
  }
  
  // Keyword-based matching
  const narrationKeywords = extractKeywords(narration);
  const patternKeywords = extractKeywords(pattern);
  
  if (patternKeywords.length === 0) return 0;
  
  let matchedKeywords = 0;
  for (const patternKeyword of patternKeywords) {
    for (const narrationKeyword of narrationKeywords) {
      const similarity = calculateSimilarity(patternKeyword, narrationKeyword);
      if (similarity > 0.8) {
        matchedKeywords++;
        break;
      }
    }
  }
  
  return matchedKeywords / patternKeywords.length;
};

// Classify transaction using learned patterns
export const classifyTransaction = (
  narration: string,
  amount: number,
  type: 'debit' | 'credit',
  categories: Category[],
  previousTransactions: Transaction[],
  rules?: ClassificationRule[]
): ClassificationResult => {
  
  const candidates: Array<{
    categoryId: string;
    categoryName: string;
    score: number;
    matches: string[];
  }> = [];
  
  // 1. Check against explicit rules first
  if (rules) {
    for (const rule of rules) {
      const matchScore = matchPattern(narration, rule.pattern);
      if (matchScore > 0.5) {
        const category = categories.find(c => c.id === rule.categoryId);
        if (category) {
          candidates.push({
            categoryId: rule.categoryId,
            categoryName: category.name,
            score: matchScore * rule.confidence,
            matches: [rule.pattern],
          });
        }
      }
    }
  }
  
  // 2. Check against category patterns
  for (const category of categories) {
    // Only check categories that match transaction type
    if ((type === 'credit' && category.type === 'income') ||
        (type === 'debit' && category.type === 'expense')) {
      
      let maxScore = 0;
      const matches: string[] = [];
      
      for (const pattern of category.patterns || []) {
        const score = matchPattern(narration, pattern);
        if (score > maxScore) {
          maxScore = score;
          matches.push(pattern);
        }
      }
      
      if (maxScore > 0.3) {
        candidates.push({
          categoryId: category.id,
          categoryName: category.name,
          score: maxScore,
          matches,
        });
      }
    }
  }
  
  // 3. Learn from previous similar transactions
  const similarTransactions = previousTransactions.filter(txn => {
    if (txn.type !== type) return false;
    const similarity = calculateSimilarity(
      txn.narration.toLowerCase(),
      narration.toLowerCase()
    );
    return similarity > 0.7;
  });
  
  if (similarTransactions.length > 0) {
    const categoryCounts = new Map<string, number>();
    similarTransactions.forEach(txn => {
      if (txn.categoryId) {
        categoryCounts.set(
          txn.categoryId,
          (categoryCounts.get(txn.categoryId) || 0) + 1
        );
      }
    });
    
    for (const [categoryId, count] of categoryCounts) {
      const category = categories.find(c => c.id === categoryId);
      if (category) {
        const existingCandidate = candidates.find(c => c.categoryId === categoryId);
        const historicalScore = (count / similarTransactions.length) * 0.8;
        
        if (existingCandidate) {
          existingCandidate.score = Math.max(existingCandidate.score, historicalScore);
        } else {
          candidates.push({
            categoryId,
            categoryName: category.name,
            score: historicalScore,
            matches: ['historical pattern'],
          });
        }
      }
    }
  }
  
  // 4. Amount-based heuristics
  if (candidates.length === 0 && type === 'debit') {
    // Large round numbers might be rent, salaries, etc.
    if (amount >= 1000 && amount % 1000 === 0) {
      const rentCategory = categories.find(c => 
        c.type === 'expense' && c.name.toLowerCase().includes('rent')
      );
      const salaryCategory = categories.find(c => 
        c.type === 'expense' && c.name.toLowerCase().includes('salary')
      );
      
      if (amount >= 20000 && salaryCategory) {
        candidates.push({
          categoryId: salaryCategory.id,
          categoryName: salaryCategory.name,
          score: 0.4,
          matches: ['amount heuristic'],
        });
      } else if (rentCategory) {
        candidates.push({
          categoryId: rentCategory.id,
          categoryName: rentCategory.name,
          score: 0.4,
          matches: ['amount heuristic'],
        });
      }
    }
  }
  
  // Sort by score
  candidates.sort((a, b) => b.score - a.score);
  
  // Determine if needs review (low confidence)
  const bestMatch = candidates[0];
  const needsReview = !bestMatch || bestMatch.score < 0.6;
  
  if (!bestMatch) {
    // No match found - return uncategorized
    return {
      categoryId: '',
      categoryName: 'Uncategorized',
      confidence: 0,
      reasoning: 'No matching patterns found',
      alternativeSuggestions: [],
      needsReview: true,
    };
  }
  
  // Build reasoning
  const reasoning = `Matched pattern: "${bestMatch.matches[0]}" (${Math.round(bestMatch.score * 100)}% confidence)`;
  
  // Alternative suggestions (top 3)
  const alternatives = candidates
    .slice(1, 4)
    .map(c => ({
      categoryId: c.categoryId,
      categoryName: c.categoryName,
      confidence: Math.round(c.score * 100),
    }));
  
  return {
    categoryId: bestMatch.categoryId,
    categoryName: bestMatch.categoryName,
    confidence: Math.round(bestMatch.score * 100),
    reasoning,
    alternativeSuggestions: alternatives,
    needsReview,
  };
};

// Learn from user feedback - update patterns
export const learnFromFeedback = (
  narration: string,
  selectedCategoryId: string,
  previousCategoryId: string | null,
  categories: Category[]
): Category[] => {
  const keywords = extractKeywords(narration);
  
  // Find the category
  const updatedCategories = categories.map(category => {
    if (category.id === selectedCategoryId) {
      // Add new patterns from this transaction
      const newPatterns = keywords.filter(keyword => {
        // Only add if not already present and is meaningful
        return keyword.length > 3 && 
               !category.patterns.some(p => p.toLowerCase().includes(keyword));
      });
      
      // Add significant phrases (2-3 word combinations)
      const words = narration.toLowerCase().split(/\s+/);
      const phrases: string[] = [];
      for (let i = 0; i < words.length - 1; i++) {
        const phrase = `${words[i]} ${words[i + 1]}`;
        if (phrase.length > 5 && phrase.length < 30) {
          phrases.push(phrase);
        }
      }
      
      return {
        ...category,
        patterns: [
          ...category.patterns,
          ...newPatterns.slice(0, 3), // Add top 3 keywords
          ...phrases.slice(0, 2), // Add top 2 phrases
        ].slice(0, 20), // Keep max 20 patterns
      };
    }
    
    // Remove patterns from previously incorrect category
    if (previousCategoryId && category.id === previousCategoryId) {
      return {
        ...category,
        patterns: category.patterns.filter(pattern => {
          const match = matchPattern(narration, pattern);
          return match < 0.8; // Keep patterns that don't strongly match this narration
        }),
      };
    }
    
    return category;
  });
  
  return updatedCategories;
};

// Generate confidence-based questions for user
export const generateClarificationQuestion = (
  classification: ClassificationResult,
  narration: string
): string | null => {
  if (classification.confidence >= 80) {
    return null; // High confidence, no question needed
  }
  
  if (classification.alternativeSuggestions.length > 0) {
    const topAlternative = classification.alternativeSuggestions[0];
    return `Is this "${classification.categoryName}" or "${topAlternative.categoryName}"?`;
  }
  
  if (classification.confidence === 0) {
    return `What category should "${narration}" be classified under?`;
  }
  
  return `Is "${classification.categoryName}" the correct category for this transaction?`;
};

// Batch classification for imports
export const batchClassify = (
  transactions: Array<{ narration: string; amount: number; type: 'debit' | 'credit' }>,
  categories: Category[],
  previousTransactions: Transaction[],
  rules?: ClassificationRule[]
): Map<number, ClassificationResult> => {
  const results = new Map<number, ClassificationResult>();
  
  transactions.forEach((txn, index) => {
    const result = classifyTransaction(
      txn.narration,
      txn.amount,
      txn.type,
      categories,
      previousTransactions,
      rules
    );
    results.set(index, result);
  });
  
  return results;
};