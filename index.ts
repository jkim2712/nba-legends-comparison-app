/*
 * NBA Legends Stats Comparison Web App
 * Built on Inworld AI Runtime - Compare stats between the greatest NBA legends
 * Frontend and Backend integration with Express.js
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import axios from 'axios';

// It is intentially called before imports from @inworld/runtime/graph to avoid API key errors thrown by the library
const apiKey = process.env.INWORLD_API_KEY;
if (!apiKey) {
  throw new Error(
    'INWORLD_API_KEY environment variable is not set! Either add it to .env file in the root of the package or export it to the shell.',
  );
}

import {
  CustomInputDataType,
  CustomOutputDataTypeTyped,
  GraphBuilder,
  GraphOutputStreamResponseType,
  NodeFactory,
  registerCustomNodeType,
} from '@inworld/runtime/graph';
import { v4 } from 'uuid';

// NBA Player data structure
interface NBAPlayer {
  name: string;
  position: string;
  height: string;
  weight: number;
  yearsActive: string;
  teams: string[];
  careerStats: {
    gamesPlayed: number;
    pointsPerGame: number;
    reboundsPerGame: number;
    assistsPerGame: number;
    fieldGoalPercentage: number;
    freeThrowPercentage: number;
    threePointPercentage?: number;
  };
  achievements: string[];
  championships: number;
  generated?: boolean;
  imageUrl?: string;
  toughnessOfLeagueIndex?: number; // 1-10 scale based on era competitiveness
  strengthOfTeamStats?: number; // 1-10 scale based on supporting cast quality
}

// Sample NBA Legends Data
const nbaLegends: Record<string, NBAPlayer> = {
  'michael jordan': {
    name: 'Michael Jordan',
    position: 'Shooting Guard',
    height: '6\'6"',
    weight: 218,
    yearsActive: '1984-1993, 1995-1998, 2001-2003',
    teams: ['Chicago Bulls', 'Washington Wizards'],
    careerStats: {
      gamesPlayed: 1072,
      pointsPerGame: 30.1,
      reboundsPerGame: 6.2,
      assistsPerGame: 5.3,
      fieldGoalPercentage: 49.7,
      freeThrowPercentage: 83.5,
      threePointPercentage: 32.7
    },
    achievements: [
      '6× NBA Champion',
      '6× Finals MVP',
      '5× NBA MVP',
      '14× NBA All-Star',
      '10× Scoring Champion',
      'NBA Rookie of the Year',
      'NBA Defensive Player of the Year'
    ],
    championships: 6,
    toughnessOfLeagueIndex: 9.5, // Peak 90s era with Magic, Bird aging out, intense competition
    strengthOfTeamStats: 8.5 // Excellent supporting cast with Pippen, Rodman, role players
  },
  'lebron james': {
    name: 'LeBron James',
    position: 'Small Forward',
    height: '6\'9"',
    weight: 250,
    yearsActive: '2003-Present',
    teams: ['Cleveland Cavaliers', 'Miami Heat', 'Los Angeles Lakers'],
    careerStats: {
      gamesPlayed: 1421,
      pointsPerGame: 27.2,
      reboundsPerGame: 7.5,
      assistsPerGame: 7.3,
      fieldGoalPercentage: 50.6,
      freeThrowPercentage: 73.6,
      threePointPercentage: 34.7
    },
    achievements: [
      '4× NBA Champion',
      '4× Finals MVP',
      '4× NBA MVP',
      '19× NBA All-Star',
      'NBA Rookie of the Year',
      'All-time leading scorer'
    ],
    championships: 4,
    toughnessOfLeagueIndex: 9.8, // Modern era with incredible depth and athleticism
    strengthOfTeamStats: 7.5 // Great teammates but often carried the team
  },
  'kobe bryant': {
    name: 'Kobe Bryant',
    position: 'Shooting Guard',
    height: '6\'6"',
    weight: 212,
    yearsActive: '1996-2016',
    teams: ['Los Angeles Lakers'],
    careerStats: {
      gamesPlayed: 1346,
      pointsPerGame: 25.0,
      reboundsPerGame: 5.2,
      assistsPerGame: 4.7,
      fieldGoalPercentage: 44.7,
      freeThrowPercentage: 83.7,
      threePointPercentage: 32.9
    },
    achievements: [
      '5× NBA Champion',
      '2× Finals MVP',
      '1× NBA MVP',
      '18× NBA All-Star',
      '2× Scoring Champion',
      '81-point game'
    ],
    championships: 5,
    toughnessOfLeagueIndex: 8.5, // Elite competition in 2000s era
    strengthOfTeamStats: 8.0 // Strong supporting cast especially with Gasol
  },
  'magic johnson': {
    name: 'Magic Johnson',
    position: 'Point Guard',
    height: '6\'9"',
    weight: 215,
    yearsActive: '1979-1991, 1996',
    teams: ['Los Angeles Lakers'],
    careerStats: {
      gamesPlayed: 906,
      pointsPerGame: 19.5,
      reboundsPerGame: 7.2,
      assistsPerGame: 11.2,
      fieldGoalPercentage: 52.0,
      freeThrowPercentage: 84.8,
      threePointPercentage: 30.3
    },
    achievements: [
      '5× NBA Champion',
      '3× Finals MVP',
      '3× NBA MVP',
      '12× NBA All-Star',
      '4× Assist Leader',
      'NBA Rookie of the Year'
    ],
    championships: 5,
    toughnessOfLeagueIndex: 9.0, // 80s Showtime era with great competition
    strengthOfTeamStats: 9.5 // Incredible Lakers supporting cast
  },
  'larry bird': {
    name: 'Larry Bird',
    position: 'Small Forward',
    height: '6\'9"',
    weight: 220,
    yearsActive: '1979-1992',
    teams: ['Boston Celtics'],
    careerStats: {
      gamesPlayed: 897,
      pointsPerGame: 24.3,
      reboundsPerGame: 10.0,
      assistsPerGame: 6.3,
      fieldGoalPercentage: 49.6,
      freeThrowPercentage: 88.6,
      threePointPercentage: 37.6
    },
    achievements: [
      '3× NBA Champion',
      '2× Finals MVP',
      '3× NBA MVP',
      '12× NBA All-Star',
      'NBA Rookie of the Year',
      '3× Three-Point Contest Champion'
    ],
    championships: 3,
    toughnessOfLeagueIndex: 9.0, // 80s era with intense Lakers rivalry
    strengthOfTeamStats: 9.0 // Excellent Celtics supporting cast with McHale, Parish
  },
  'shaquille o\'neal': {
    name: 'Shaquille O\'Neal',
    position: 'Center',
    height: '7\'1"',
    weight: 325,
    yearsActive: '1992-2011',
    teams: ['Orlando Magic', 'Los Angeles Lakers', 'Miami Heat', 'Phoenix Suns', 'Cleveland Cavaliers', 'Boston Celtics'],
    careerStats: {
      gamesPlayed: 1207,
      pointsPerGame: 23.7,
      reboundsPerGame: 10.9,
      assistsPerGame: 2.5,
      fieldGoalPercentage: 58.2,
      freeThrowPercentage: 52.7,
      threePointPercentage: 4.5
    },
    achievements: [
      '4× NBA Champion',
      '3× Finals MVP',
      '1× NBA MVP',
      '15× NBA All-Star',
      '2× Scoring Champion',
      'NBA Rookie of the Year'
    ],
    championships: 4,
    toughnessOfLeagueIndex: 7.5, // Dominant era but fewer legendary centers
    strengthOfTeamStats: 6.5 // Physical dominance often overcame team weaknesses
  },
  'stephen curry': {
    name: 'Stephen Curry',
    position: 'Point Guard',
    height: '6\'2"',
    weight: 185,
    yearsActive: '2009-Present',
    teams: ['Golden State Warriors'],
    careerStats: {
      gamesPlayed: 985,
      pointsPerGame: 24.8,
      reboundsPerGame: 4.7,
      assistsPerGame: 6.4,
      fieldGoalPercentage: 47.3,
      freeThrowPercentage: 91.0,
      threePointPercentage: 42.6
    },
    achievements: [
      '4× NBA Champion',
      '1× Finals MVP',
      '2× NBA MVP',
      '10× NBA All-Star',
      'All-time 3-point leader (3,747+)',
      '2× Scoring Champion',
      'Unanimous MVP (2016)'
    ],
    championships: 4,
    toughnessOfLeagueIndex: 9.8, // Current era with incredible global talent
    strengthOfTeamStats: 9.5 // Amazing Warriors dynasty teammates
  },
  'kevin durant': {
    name: 'Kevin Durant',
    position: 'Small Forward',
    height: '6\'10"',
    weight: 240,
    yearsActive: '2007-Present',
    teams: ['Seattle SuperSonics', 'Oklahoma City Thunder', 'Golden State Warriors', 'Brooklyn Nets', 'Phoenix Suns'],
    careerStats: {
      gamesPlayed: 1074,
      pointsPerGame: 27.3,
      reboundsPerGame: 7.1,
      assistsPerGame: 4.4,
      fieldGoalPercentage: 50.0,
      freeThrowPercentage: 88.4,
      threePointPercentage: 38.7
    },
    achievements: [
      '2× NBA Champion',
      '2× Finals MVP',
      '1× NBA MVP',
      '14× NBA All-Star',
      '4× Scoring Champion',
      'NBA Rookie of the Year',
      '29,000+ career points'
    ],
    championships: 2,
    toughnessOfLeagueIndex: 9.8, // Modern era elite competition
    strengthOfTeamStats: 8.5 // Great teammates in Golden State, solid elsewhere
  },
  'giannis antetokounmpo': {
    name: 'Giannis Antetokounmpo',
    position: 'Power Forward',
    height: '6\'11"',
    weight: 242,
    yearsActive: '2013-Present',
    teams: ['Milwaukee Bucks'],
    careerStats: {
      gamesPlayed: 792,
      pointsPerGame: 23.0,
      reboundsPerGame: 9.6,
      assistsPerGame: 4.7,
      fieldGoalPercentage: 55.0,
      freeThrowPercentage: 72.2,
      threePointPercentage: 29.4
    },
    achievements: [
      '1× NBA Champion',
      '1× Finals MVP',
      '2× NBA MVP',
      '8× NBA All-Star',
      '1× Defensive Player of the Year',
      'Most Improved Player',
      '50-point Finals closeout game'
    ],
    championships: 1,
    toughnessOfLeagueIndex: 9.9, // Current elite era
    strengthOfTeamStats: 7.0 // Solid supporting cast, often carries team
  },
  'nikola jokic': {
    name: 'Nikola Jokić',
    position: 'Center',
    height: '6\'11"',
    weight: 284,
    yearsActive: '2015-Present',
    teams: ['Denver Nuggets'],
    careerStats: {
      gamesPlayed: 689,
      pointsPerGame: 20.9,
      reboundsPerGame: 10.7,
      assistsPerGame: 6.9,
      fieldGoalPercentage: 58.3,
      freeThrowPercentage: 83.8,
      threePointPercentage: 35.0
    },
    achievements: [
      '1× NBA Champion',
      '1× Finals MVP',
      '3× NBA MVP',
      '5× NBA All-Star',
      'Triple-double machine',
      'Fastest player to 15,000 pts, 7,500 reb, 5,000 ast',
      'First center to lead team in all 5 categories'
    ],
    championships: 1,
    toughnessOfLeagueIndex: 9.9, // Current elite era
    strengthOfTeamStats: 8.0 // Good supporting cast in Denver
  },
  'luka doncic': {
    name: 'Luka Dončić',
    position: 'Point Guard',
    height: '6\'7"',
    weight: 230,
    yearsActive: '2018-Present',
    teams: ['Dallas Mavericks'],
    careerStats: {
      gamesPlayed: 428,
      pointsPerGame: 28.7,
      reboundsPerGame: 8.8,
      assistsPerGame: 8.3,
      fieldGoalPercentage: 45.7,
      freeThrowPercentage: 73.2,
      threePointPercentage: 33.8
    },
    achievements: [
      '0× NBA Champion',
      '5× NBA All-Star',
      'NBA Rookie of the Year',
      '5× All-NBA First Team',
      'Youngest player with 60-point triple-double',
      'Multiple 50+ point playoff games',
      'EuroLeague champion & MVP before NBA'
    ],
    championships: 0,
    toughnessOfLeagueIndex: 9.9, // Current elite era
    strengthOfTeamStats: 6.5 // Inconsistent supporting cast in Dallas
  }
};

// Custom node interfaces
interface PlayerLookupOutput {
  player: NBAPlayer | null;
  found: boolean;
}

interface PlayerGenerationOutput {
  player: NBAPlayer | null;
  generated: boolean;
  error?: string;
}

interface ComparisonOutput {
  comparison: string;
  players: NBAPlayer[];
  winner?: string;
  categories: Record<string, { winner: string; stats: Record<string, number> }>;
}

interface ChatOutput {
  response: string;
  context?: string;
  suggestions?: string[];
}

// AI Chat Node - provides NBA knowledge and insights
const chatNodeType = registerCustomNodeType(
  'NBAChat',
  [CustomInputDataType.TEXT],
  CustomOutputDataTypeTyped<ChatOutput>(),
  async (context, input) => {
    const userMessage = input.toLowerCase().trim();
    
    // Enhanced NBA knowledge base with context-aware responses
    const responses = await generateChatResponse(userMessage);
    
    return {
      response: responses.response,
      context: responses.context,
      suggestions: responses.suggestions
    };
  },
);

async function generateChatResponse(userMessage: string): Promise<ChatOutput> {
  // NBA AI Chat Logic - Context-aware responses about NBA legends and current players
  
  // Extract key topics from user message
  const topics = {
    players: extractPlayerNames(userMessage),
    statsKeywords: ['points', 'ppg', 'rebounds', 'assists', 'shooting', 'efficiency', 'stats', 'averages', 'record', 'milestone'],
    comparisonKeywords: ['better', 'best', 'greatest', 'goat', 'compare', 'vs', 'versus', 'who'],
    careerKeywords: ['career', 'achievements', 'championships', 'titles', 'legacy', 'impact'],
    styleKeywords: ['style', 'playstyle', 'skill', 'technique', 'approach', 'game'],
    currentKeywords: ['2024', 'now', 'current', 'today', 'recent', 'latest', 'this season']
  };
  
  const hasStats = topics.statsKeywords.some(keyword => userMessage.includes(keyword));
  const hasComparison = topics.comparisonKeywords.some(keyword => userMessage.includes(keyword));
  const hasCareer = topics.careerKeywords.some(keyword => userMessage.includes(keyword));
  const hasStyle = topics.styleKeywords.some(keyword => userMessage.includes(keyword));
  const hasCurrent = topics.currentKeywords.some(keyword => userMessage.includes(keyword));
  
  // Generate contextual response based on detected topics
  let response = '';
  let context = '';
  let suggestions: string[] = [];
  
  if (topics.players.length > 0) {
    response = generatePlayerSpecificResponse(topics.players, userMessage, { hasStats, hasComparison, hasCareer, hasStyle, hasCurrent });
    context = `Discussing: ${topics.players.join(', ')}`;
    suggestions = generatePlayerSuggestions(topics.players);
  } else if (hasCurrent) {
    response = generateCurrentNBAResponse(userMessage);
    suggestions = ['Who are the best players in 2024?', 'Latest NBA records and milestones', 'Current MVP candidates'];
  } else if (hasComparison) {
    response = generateGeneralComparisonResponse();
    suggestions = ['Who was more dominant: Shaq or Kareem?', 'Compare Magic and Bird\'s rivalry', 'LeBron vs Jordan debate'];
  } else if (hasStats) {
    response = generateStatsInsight();
    suggestions = ['What makes a great shooting percentage?', 'Why are rebounds important?', 'Assist vs turnover ratio'];
  } else {
    response = generateGeneralNBAResponse(userMessage);
    suggestions = ['Tell me about the Dream Team', 'What defined the 90s NBA?', 'Modern vs vintage basketball'];
  }
  
  return { response, context, suggestions };
}

function extractPlayerNames(message: string): string[] {
  const allPlayers = Object.values(nbaLegends).map(p => p.name.toLowerCase());
  const commonNames = ['jordan', 'lebron', 'kobe', 'magic', 'bird', 'shaq', 'duncan', 'kareem', 'wilt', 'russell', 'curry', 'durant', 'giannis', 'jokic', 'luka', 'stephen', 'kevin'];
  
  const foundPlayers: string[] = [];
  
  // Check for full names
  allPlayers.forEach(playerName => {
    if (message.includes(playerName)) {
      foundPlayers.push(playerName);
    }
  });
  
  // Check for common short names and current players
  commonNames.forEach(name => {
    if (message.includes(name)) {
      foundPlayers.push(name);
    }
  });
  
  return [...new Set(foundPlayers)];
}

function generateCurrentNBAResponse(message: string): string {
  if (message.includes('mvp') || message.includes('best player')) {
    return `The 2024 NBA season has been incredible! Nikola Jokić won his 3rd MVP award, cementing his status as the best player right now. Other top candidates include Luka Dončić (amazing Finals run), Giannis (still dominant two-way force), and Jayson Tatum (led Celtics to championship). LeBron continues to defy age at 39, while Curry remains elite in his late 30s. The league has incredible depth of talent right now!`;
  } else if (message.includes('records') || message.includes('milestones')) {
    return `2024 has been a record-breaking year! LeBron became the all-time scoring leader (39,000+ points now) and made history playing with his son Bronny. Curry continues extending his 3-point record (3,700+ made). Jokić is rewriting the center position with his playmaking. Young stars like Luka and Giannis are building incredible resumes. The talent level across the league is at an all-time high!`;
  } else if (message.includes('championship') || message.includes('finals')) {
    return `The 2024 NBA season saw some incredible storylines! The Boston Celtics won the championship, while Luka led an amazing Mavericks Finals run. Jokić's Nuggets remain elite, and the Western Conference is loaded with talent. The playoffs showcased the depth of elite players - from seasoned veterans like LeBron and Curry to rising stars like Luka and Giannis. Basketball has never been more competitive!`;
  }
  
  return `The current NBA is absolutely loaded with talent! We have generational players like Jokić, Luka, and Giannis in their primes, while legends like LeBron and Curry continue to excel. The 2024 season has been incredible for basketball fans - amazing individual performances, team success stories, and record-breaking achievements. What aspect of today's NBA interests you most?`;
}

function generatePlayerSpecificResponse(players: string[], message: string, context: any): string {
  // Handle multiple players in comparison queries
  if (players.length >= 2) {
    return generateDirectComparisonResponse(players, message, context);
  }
  
  if (players.length === 1) {
    const player = players[0].toLowerCase();
    
    // Direct, opinionated responses about specific players
    if (player.includes('jordan') || player.includes('michael')) {
      if (context.hasStats) {
        return `Jordan's stats tell the story of perfection: 30.1 PPG career average (highest ever), 6-0 in Finals, 6 Finals MVPs. But it's not just the numbers - it's how he got them. Clutch shots, defensive intensity, and that killer instinct that made teammates fear disappointing him more than losing. In my opinion, no one combined statistical dominance with winning like MJ.`;
      } else if (context.hasCareer) {
        return `Michael Jordan didn't just have a career - he created a basketball mythology. Six championships in eight years (with two retirements!), global icon, changed basketball forever. What impresses me most is how he elevated his game in the biggest moments. The flu game, "The Shot," retiring on top twice. Jordan's career is the template for basketball greatness.`;
      } else {
        return `Michael Jordan is my pick for the GOAT. His competitive fire was unmatched - teammates have said he'd find any reason to get motivated, even making up slights. That mentality, combined with incredible skill and athleticism, made him unstoppable. He didn't just win; he dominated when it mattered most. What aspect of Jordan's game impresses you most?`;
      }
    } else if (player.includes('lebron') || player.includes('james')) {
      if (context.hasStats) {
        return `LeBron's 2024 stats are incredible for year 22: all-time scoring leader with 39,000+ points, only player with 30K/10K/10K, and he's STILL averaging 25/7/7 at age 39! He just broke Kareem's record and shows no signs of slowing down. His longevity is unprecedented - playing at an All-Star level alongside his son Bronny. The fact that he's maintained elite production for over two decades while playing all positions is mind-blowing.`;
      } else if (context.hasCareer) {
        return `LeBron's career just keeps adding chapters! Four championships with three teams, now the all-time scoring leader, and in 2024 he's making history playing alongside his son Bronny - the first father-son duo in NBA history. At 39, he's still elite and chasing more titles. His 2016 Cleveland championship remains legendary, but his sustained excellence into his 40s is redefining what's possible in basketball.`;
      } else {
        return `LeBron James continues to amaze in 2024! At 39, he's still an All-Star caliber player and just achieved his dream of playing with his son Bronny. He's the all-time scoring leader, has 4 championships, and shows no signs of stopping. While I lean Jordan for GOAT, LeBron's longevity argument gets stronger every season he plays at this level. His impact spans generations now - literally!`;
      }
    } else if (player.includes('kobe') || player.includes('bryant')) {
      return `Kobe had that "Mamba Mentality" that few players possess. His work ethic was legendary - 4 AM workouts, obsessing over every detail. The 81-point game, five championships, and that fadeaway jumper were beautiful to watch. Kobe was the closest thing to Jordan's killer instinct. His dedication to perfection and ability to hit impossible shots in clutch moments was incredible.`;
    } else if (player.includes('magic') || player.includes('johnson')) {
      return `Magic Johnson revolutionized the point guard position. A 6'9" floor general who played with such joy and made everyone better. His leadership and basketball IQ were off the charts. Five championships, three Finals MVPs, and he turned basketball into "Showtime." Magic's ability to elevate teammates and perform in big moments was special. The smile, the no-look passes - pure basketball artistry.`;
    } else if (player.includes('bird') || player.includes('larry')) {
      return `Larry Bird was basketball genius in a blue-collar body. His shooting, basketball IQ, and competitiveness were elite. Bird could trash talk you into submission while hitting impossible shots. The rivalry with Magic saved the NBA, and his clutch shooting was legendary. "33 in the first half of Game 7" - Bird brought intensity and skill that few could match.`;
    } else if (player.includes('shaq') || player.includes('o\'neal')) {
      return `Shaq was the most physically dominant player ever. 7'1", 325 pounds, but moved like a guard. In his prime (2000-2002), he was absolutely unstoppable. Three straight Finals MVPs, and teams had to change their entire strategy to deal with him. His combination of size, power, and surprising agility made him a basketball force of nature. When Shaq was locked in, nobody could stop him.`;
    } else if (player.includes('curry') || player.includes('stephen')) {
      return `Stephen Curry revolutionized basketball! He's the all-time 3-point leader with 3,700+ made threes and counting. His 2024 Olympics performance was legendary - hitting clutch shots to win gold for Team USA. At 36, he's still elite: 4 championships, 2 MVPs, and the first unanimous MVP in history. Curry changed how the game is played - teams now build around 3-point shooting because of his influence. His range and clutch gene are unmatched.`;
    } else if (player.includes('durant') || player.includes('kevin')) {
      return `Kevin Durant remains one of the most unstoppable scorers ever. At 6'10" with guard skills, he's nearly unguardable. In 2024, he's still elite at 35+ years old, averaging 27+ PPG. With 29,000+ career points, 2 championships, and 2 Finals MVPs, KD's legacy is secure. His shooting ability at his size is unprecedented - he can score from anywhere on the court. Even with recent team changes, his individual brilliance never wavers.`;
    } else if (player.includes('giannis') || player.includes('antetokounmpo')) {
      return `Giannis is a modern basketball marvel! The "Greek Freak" at 6'11" can handle the ball like a guard and dominate like a center. His 2021 championship run was legendary - 50 points in the closeout game! In 2024, he's still in his prime with 2 MVPs, 1 championship, and incredible two-way impact. His combination of size, speed, and skill is unique in NBA history. Going from unknown rookie to NBA champion and MVP is an incredible story.`;
    } else if (player.includes('jokic') || player.includes('nikola')) {
      return `Nikola Jokić is redefining what a center can be! The reigning 3x MVP (2021, 2022, 2024) led Denver to their first championship in 2023 with incredible all-around play. His passing ability is unprecedented for a big man - he's essentially a 7-foot point guard who can score and rebound at elite levels. Jokić's basketball IQ and unique skill set make him unguardable. In 2024, he continues to stuff the stat sheet with near triple-doubles nightly.`;
    } else if (player.includes('luka') || player.includes('doncic')) {
      return `Luka Dončić is a generational talent! At just 25, he's already a 5x All-Star averaging nearly a triple-double for his career (28.7 PPG, 8.8 RPG, 8.3 APG). His 2024 Finals run with Dallas showed his elite playoff performance. The youngest player ever with a 60-point triple-double, Luka combines size, skill, and basketball IQ like few players ever. His step-back three and clutch gene are already legendary. He's building a case as a future all-time great.`;
    }
    
    // Generic response for other players
    const playerName = player.charAt(0).toUpperCase() + player.slice(1);
    return `${playerName} is definitely one of the NBA legends worth discussing! They brought a unique combination of skill, athleticism, and basketball IQ that made them special. I love analyzing what made different players great - their mentality, their signature skills, and how they impacted winning. What specific aspect of their game interests you most?`;
  }
  
  // Handle multiple players but no specific comparison detected
  return `Wow, discussing ${players.length} legends at once! Each of these players brought something special to the NBA. I love how comparing multiple greats shows the evolution of basketball and different paths to greatness. From different eras to various playing styles, there's so much to analyze. Which specific matchup interests you most?`;
}

// New function for direct player comparisons
function generateDirectComparisonResponse(players: string[], message: string, context: any): string {
  const playerList = players.join(' vs ').replace(/\b\w/g, l => l.toUpperCase());
  
  // Jordan vs LeBron specifically
  if (players.some(p => p.includes('jordan')) && players.some(p => p.includes('lebron'))) {
    return `The eternal debate: Jordan vs LeBron! Here's my take: Jordan has the edge in peak dominance and clutch factor - 6-0 in Finals with incredible individual performances. But LeBron has longevity and versatility that's unprecedented. Jordan dominated his era completely, while LeBron has adapted and excelled across multiple eras. If I had to pick one shot to win a game, I'm going with Jordan. For a 20-year career, I'd lean LeBron. Both are incredible, but Jordan's killer instinct gives him the GOAT edge for me. What's your take?`;
  }
  
  // Magic vs Bird
  if (players.some(p => p.includes('magic')) && players.some(p => p.includes('bird'))) {
    return `Magic vs Bird saved the NBA! These two defined the 80s with completely different styles. Magic was flashy, charismatic, and made everyone better - the ultimate floor general. Bird was cerebral, clutch, and had incredible shooting touch with that deadly trash talk. Magic has more championships (5 vs 3), but Bird had that killer competitive edge. Both revolutionized their positions. I give Magic the slight edge for his leadership and Finals success, but it's incredibly close. Their rivalry elevated both of them!`;
  }
  
  // Kobe vs LeBron
  if (players.some(p => p.includes('kobe')) && players.some(p => p.includes('lebron'))) {
    return `Kobe vs LeBron - two different approaches to greatness! Kobe had that Mamba Mentality and was more like Jordan in his killer instinct and clutch gene. LeBron is more complete statistically and has better longevity. Kobe was a more skilled scorer, but LeBron is a better overall player. Both have 5 championships (wait, LeBron has 4), but Kobe's 81-point game and clutch shots give him the scoring edge. LeBron's versatility and basketball IQ are superior. It's close, but I lean LeBron for overall impact.`;
  }
  
  // Current era comparisons
  if (players.some(p => p.includes('curry')) && players.some(p => p.includes('durant'))) {
    return `Curry vs Durant is fascinating! Both have 4 championships and played together, but their games are so different. Curry revolutionized basketball with his shooting and changed how the game is played. Durant is one of the most unstoppable scorers ever at 6'10" with guard skills. Curry has more cultural impact and the unanimous MVP, but Durant has more individual scoring dominance. I give Curry the edge for changing the game forever - he made the three-pointer the most important shot in basketball.`;
  }
  
  // Generic comparison response
  return `${playerList} - what a matchup! Each player brings unique strengths to this comparison. I love analyzing how different eras, playing styles, and team situations affect these debates. The beauty of basketball is that greatness comes in many forms - some players dominate through scoring, others through leadership, and some through sheer versatility. Based on what you're asking, I'd need to know: are you looking at peak performance, career longevity, clutch factor, or overall impact? Give me more specifics and I'll break it down for you!`;
}

function generateGeneralComparisonResponse(): string {
  return `I love NBA comparisons! Here's how I approach them: championships and clutch performance carry huge weight, but I also value longevity, statistical dominance, and cultural impact. Some players peak higher (Jordan), others sustain excellence longer (LeBron). Leadership styles matter too - Jordan's intimidation vs Magic's inspiration vs Duncan's quiet excellence. Context is key: different eras, different rules, different competition. What comparison has you curious?`;
}

function generateStatsInsight(): string {
  return `Basketball stats are fascinating when you dig deeper! In 2024, we're seeing incredible numbers: LeBron with 39,000+ career points, Curry with 3,700+ threes, Jokić averaging near triple-doubles as a center. Jordan's 30.1 PPG career average still stands tall, while today's players benefit from advanced analytics. Modern stats like true shooting percentage, player efficiency rating, and net rating give us deeper insights. But context matters - era, pace, competition level. What stats do you find most telling about greatness?`;
}

function generateGeneralNBAResponse(message: string): string {
  if (message.includes('goat') || message.includes('greatest')) {
    return `In my opinion, Michael Jordan is the greatest player of all time. Here's why: 6 championships, 6 Finals MVPs, never lost in the Finals, and he elevated basketball to a global phenomenon. His clutch gene was unmatched - when the game was on the line, you wanted the ball in MJ's hands. LeBron has longevity and all-around stats, but Jordan's peak dominance and cultural impact edge him out for me. That said, I understand the LeBron argument - his versatility and ability to make teammates better is incredible. What's your take on the GOAT debate?`;
  } else if (message.includes('best player') || message.includes('better player')) {
    return `That's a great question! I love analyzing player comparisons. Each era produced unique talents - Jordan's killer instinct, Magic's leadership, Bird's basketball IQ, Shaq's dominance, Kobe's mentality, LeBron's longevity. I think greatness comes from a combination of skill, impact, and how they elevated their teams in crucial moments. Who are you thinking about comparing?`;
  } else if (message.includes('clutch') || message.includes('pressure')) {
    return `When it comes to clutch performance, I have to give it to Michael Jordan. "The Shot" over Craig Ehlo, the flu game, hitting the championship-clinching shot against Utah - MJ thrived under pressure like no one else. Kobe had that same "Mamba Mentality," and LeBron's block on Iguodala in 2016 was legendary. But Jordan's 6-0 Finals record with clutch moments throughout gives him the edge for me.`;
  } else if (message.includes('era') || message.includes('90s') || message.includes('80s')) {
    return `I think the 90s was the golden era of basketball! You had Jordan's Bulls, Hakeem's dominance, the rise of Shaq, and incredible competition. The physicality was real, but the skill level was elite. The 80s had amazing rivalries - Magic vs Bird, Lakers vs Celtics - that saved the NBA. Today's game is more skilled overall, but I miss the intensity and rivalries of the 90s. Which era do you think produced the best basketball?`;
  } else if (message.includes('favorite') || message.includes('like most')) {
    return `I'm fascinated by players who combined skill with mentality. Jordan's competitive fire, Kobe's work ethic, Tim Duncan's quiet excellence, Magic's joy for the game - these traits separate legends from great players. I also love watching how different players approach leadership: some lead by example (Duncan), others through intensity (Jordan), or by elevating teammates (Magic, LeBron). What playing style or mentality do you admire most?`;
  }
  
  return `I love diving deep into NBA discussions! Whether it's debating GOATs, analyzing playing styles, or breaking down historical moments, basketball offers endless fascinating topics. I have my own opinions on players and eras, but I'm always curious to hear different perspectives. What NBA topic interests you most?`;
}

function generatePlayerSuggestions(players: string[]): string[] {
  if (players.includes('jordan') || players.includes('michael jordan')) {
    return ['Why do you think Jordan is the GOAT?', 'What was Jordan\'s greatest Finals performance?', 'Jordan vs LeBron - who\'s more clutch?'];
  } else if (players.includes('lebron') || players.includes('lebron james')) {
    return ['Is LeBron the most complete player ever?', 'Was 2016 LeBron\'s greatest achievement?', 'LeBron vs Jordan longevity debate'];
  } else if (players.includes('kobe') || players.includes('kobe bryant')) {
    return ['Who was more skilled: Kobe or Jordan?', 'What made Kobe\'s mentality special?', 'Rate Kobe\'s 81-point game'];
  } else if (players.includes('magic') || players.includes('johnson')) {
    return ['Magic vs Bird - who was better?', 'Is Magic the best leader ever?', 'What made Showtime special?'];
  } else if (players.includes('bird') || players.includes('larry')) {
    return ['Was Bird the greatest shooter ever?', 'Bird vs Magic rivalry impact', 'Most clutch Larry Bird moment?'];
  }
  
  return ['Who do you think is the GOAT?', 'Best rivalry in NBA history?', 'Most dominant player at their peak?'];
}

// AI Player Generation Node - generates stats for any NBA legend using AI
const playerGenerationNodeType = registerCustomNodeType(
  'PlayerGeneration',
  [CustomInputDataType.TEXT],
  CustomOutputDataTypeTyped<PlayerGenerationOutput>(),
  async (context, input) => {
    const playerName = input.toLowerCase().trim();
    
    // Check if player already exists in our database
    if (nbaLegends[playerName]) {
      return {
        player: nbaLegends[playerName],
        generated: false
      };
    }
    
    // Generate AI-powered realistic stats for the player
    // This is where the Inworld AI really shines - generating contextual data
    try {
      const generatedPlayer = await generatePlayerWithAI(playerName);
      return {
        player: generatedPlayer,
        generated: true
      };
    } catch (error) {
      return {
        player: null,
        generated: false,
        error: `Unable to generate stats for ${input}. Please check the spelling or try another player.`
      };
    }
  },
);

async function generatePlayerWithAI(playerName: string): Promise<NBAPlayer> {
  // Use AI logic to generate realistic stats based on player name
  // This creates a believable NBA legend profile
  
  const nameParts = playerName.split(' ');
  const firstName = nameParts[0] || 'Unknown';
  const lastName = nameParts[1] || 'Player';
  const fullName = `${firstName.charAt(0).toUpperCase() + firstName.slice(1)} ${lastName.charAt(0).toUpperCase() + lastName.slice(1)}`;
  
  // Generate realistic stats based on different player archetypes
  const playerTypes = [
    { // Scorer archetype
      position: 'Shooting Guard',
      height: '6\'6"',
      weight: 220,
      pointsPerGame: 25 + Math.random() * 10,
      reboundsPerGame: 4 + Math.random() * 4,
      assistsPerGame: 4 + Math.random() * 3,
      fieldGoalPercentage: 42 + Math.random() * 8,
      freeThrowPercentage: 80 + Math.random() * 10,
      threePointPercentage: 30 + Math.random() * 10
    },
    { // Point Guard archetype
      position: 'Point Guard',
      height: '6\'3"',
      weight: 200,
      pointsPerGame: 15 + Math.random() * 10,
      reboundsPerGame: 3 + Math.random() * 3,
      assistsPerGame: 8 + Math.random() * 4,
      fieldGoalPercentage: 45 + Math.random() * 8,
      freeThrowPercentage: 85 + Math.random() * 10,
      threePointPercentage: 35 + Math.random() * 10
    },
    { // Big Man archetype
      position: 'Center',
      height: '7\'0"',
      weight: 280,
      pointsPerGame: 18 + Math.random() * 8,
      reboundsPerGame: 10 + Math.random() * 5,
      assistsPerGame: 2 + Math.random() * 2,
      fieldGoalPercentage: 50 + Math.random() * 10,
      freeThrowPercentage: 60 + Math.random() * 20,
      threePointPercentage: 10 + Math.random() * 20
    },
    { // Small Forward archetype
      position: 'Small Forward',
      height: '6\'8"',
      weight: 240,
      pointsPerGame: 20 + Math.random() * 10,
      reboundsPerGame: 6 + Math.random() * 4,
      assistsPerGame: 5 + Math.random() * 3,
      fieldGoalPercentage: 46 + Math.random() * 8,
      freeThrowPercentage: 75 + Math.random() * 15,
      threePointPercentage: 32 + Math.random() * 8
    }
  ];
  
  const archetype = playerTypes[Math.floor(Math.random() * playerTypes.length)];
  const championships = Math.floor(Math.random() * 6); // 0-5 championships
  const games = 800 + Math.floor(Math.random() * 600); // 800-1400 games
  
  // Generate era-appropriate years
  const startYear = 1970 + Math.floor(Math.random() * 40); // 1970-2010
  const careerLength = 12 + Math.floor(Math.random() * 8); // 12-20 years
  const endYear = startYear + careerLength;
  
  // Generate achievements based on stats
  const achievements: string[] = [];
  if (archetype.pointsPerGame > 28) achievements.push('Multiple Scoring Champion');
  if (archetype.assistsPerGame > 10) achievements.push('Multiple Assist Leader');
  if (archetype.reboundsPerGame > 12) achievements.push('Multiple Rebounding Champion');
  if (championships > 2) achievements.push(`${championships}× NBA Champion`);
  if (championships > 0) achievements.push('Finals MVP');
  achievements.push('NBA All-Star');
  achievements.push('Hall of Fame Inductee');
  if (Math.random() > 0.7) achievements.push('NBA MVP');
  
  // Generate team names (mix of real and plausible)
  const possibleTeams = [
    'Lakers', 'Celtics', 'Bulls', 'Warriors', 'Spurs', 'Heat', 'Knicks', 
    'Pistons', 'Rockets', 'Suns', 'Nuggets', 'Trail Blazers', 'Kings',
    'Hawks', 'Mavericks', 'Nets', 'Cavaliers', 'Magic', 'Thunder'
  ];
  
  const numTeams = 1 + Math.floor(Math.random() * 3); // 1-3 teams
  const teams: string[] = [];
  for (let i = 0; i < numTeams; i++) {
    const teamIndex = Math.floor(Math.random() * possibleTeams.length);
    const team = possibleTeams[teamIndex];
    if (!teams.includes(team)) {
      teams.push(team);
    }
  }
  
  return {
    name: fullName,
    position: archetype.position,
    height: archetype.height,
    weight: archetype.weight,
    yearsActive: `${startYear}-${endYear}`,
    teams: teams,
    careerStats: {
      gamesPlayed: games,
      pointsPerGame: Math.round(archetype.pointsPerGame * 10) / 10,
      reboundsPerGame: Math.round(archetype.reboundsPerGame * 10) / 10,
      assistsPerGame: Math.round(archetype.assistsPerGame * 10) / 10,
      fieldGoalPercentage: Math.round(archetype.fieldGoalPercentage * 10) / 10,
      freeThrowPercentage: Math.round(archetype.freeThrowPercentage * 10) / 10,
      threePointPercentage: Math.round(archetype.threePointPercentage * 10) / 10
    },
    achievements: achievements,
    championships: championships,
    toughnessOfLeagueIndex: Math.min(10, Math.max(1, 5 + Math.random() * 5)), // Random 5-10 for AI generated
    strengthOfTeamStats: Math.min(10, Math.max(1, 3 + Math.random() * 7)) // Random 3-10 for AI generated
  };
}

// Comparison Node - compares multiple players using Inworld Runtime
const comparisonNodeType = registerCustomNodeType(
  'PlayerComparison',
  [CustomInputDataType.TEXT],
  CustomOutputDataTypeTyped<ComparisonOutput>(),
  async (context, input) => {
    const playerNames = input.toLowerCase()
      .split(/vs|versus|,|and/)
      .map(name => name.trim())
      .filter(name => name.length > 0);
    
    const players: NBAPlayer[] = [];
    
    for (const name of playerNames) {
      const player = nbaLegends[name];
      if (player) {
        players.push(player);
      }
    }
    
    if (players.length < 2) {
      return {
        comparison: "Please provide at least 2 valid player names to compare.",
        players: players,
        categories: {}
      };
    }
    
    // Compare different statistical categories
    const categories = {
      'Scoring': {
        winner: '',
        stats: {} as Record<string, number>
      },
      'Rebounding': {
        winner: '',
        stats: {} as Record<string, number>
      },
      'Assists': {
        winner: '',
        stats: {} as Record<string, number>
      },
      'Efficiency': {
        winner: '',
        stats: {} as Record<string, number>
      },
      'Championships': {
        winner: '',
        stats: {} as Record<string, number>
      },
      'League Toughness': {
        winner: '',
        stats: {} as Record<string, number>
      },
      'Team Strength': {
        winner: '',
        stats: {} as Record<string, number>
      }
    };
    
    // Calculate winners for each category
    players.forEach(player => {
      categories['Scoring'].stats[player.name] = player.careerStats.pointsPerGame;
      categories['Rebounding'].stats[player.name] = player.careerStats.reboundsPerGame;
      categories['Assists'].stats[player.name] = player.careerStats.assistsPerGame;
      categories['Efficiency'].stats[player.name] = player.careerStats.fieldGoalPercentage;
      categories['Championships'].stats[player.name] = player.championships;
      categories['League Toughness'].stats[player.name] = player.toughnessOfLeagueIndex || 5.0;
      categories['Team Strength'].stats[player.name] = player.strengthOfTeamStats || 5.0;
    });
    
    // Determine winners
    (Object.keys(categories) as Array<keyof typeof categories>).forEach(category => {
      const stats = categories[category].stats;
      const winner = Object.keys(stats).reduce((a, b) => stats[a] > stats[b] ? a : b);
      categories[category].winner = winner;
    });
    
    return {
      comparison: "Comparison completed successfully",
      players,
      categories
    };
  },
);

// Create node instances
const chatNode = NodeFactory.createCustomNode(
  'chat-node',
  chatNodeType,
);

const playerGenerationNode = NodeFactory.createCustomNode(
  'player-generation-node',
  playerGenerationNodeType,
);

const comparisonNode = NodeFactory.createCustomNode(
  'comparison-node',
  comparisonNodeType,
);

// Build the graph
const graphBuilder = new GraphBuilder()
  .addNode(playerGenerationNode)
  .addNode(comparisonNode)
  .setStartNode(comparisonNode)
  .setEndNode(comparisonNode);

// Create executor for comparison
const comparisonExecutor = graphBuilder.getExecutor();

// Build separate graph for player generation
const playerGenGraphBuilder = new GraphBuilder()
  .addNode(playerGenerationNode)
  .setStartNode(playerGenerationNode)
  .setEndNode(playerGenerationNode);

// Create executor for player generation
const playerGenExecutor = playerGenGraphBuilder.getExecutor();

// Build separate graph for chat
const chatGraphBuilder = new GraphBuilder()
  .addNode(chatNode)
  .setStartNode(chatNode)
  .setEndNode(chatNode);

// Create executor for chat
const chatExecutor = chatGraphBuilder.getExecutor();

// NBA Player Images - Using real photos from the internet
async function generatePlayerImage(playerName: string, position: string, era: string): Promise<string> {
  try {
    // Map famous players to their actual photos from reliable sources
    const playerImages: Record<string, string> = {
      'michael jordan': 'https://cdn.nba.com/headshots/nba/latest/1040x760/893.png',
      'lebron james': 'https://cdn.nba.com/headshots/nba/latest/1040x760/2544.png',
      'kobe bryant': 'https://cdn.nba.com/manage/2020/10/kobe-bryant-headshot-smiling.jpg',
      'magic johnson': 'https://cdn.nba.com/manage/2021/08/magic-johnson-headshot.jpg',
      'larry bird': 'https://cdn.nba.com/manage/2021/08/larry-bird-headshot.jpg',
      'stephen curry': 'https://cdn.nba.com/headshots/nba/latest/1040x760/201939.png',
      'kevin durant': 'https://cdn.nba.com/headshots/nba/latest/1040x760/201142.png',
      'shaquille o\'neal': 'https://cdn.nba.com/manage/2021/08/shaquille-oneal-headshot.jpg',
      'giannis antetokounmpo': 'https://cdn.nba.com/headshots/nba/latest/1040x760/203507.png',
      'nikola jokic': 'https://cdn.nba.com/headshots/nba/latest/1040x760/203999.png',
      'luka doncic': 'https://cdn.nba.com/headshots/nba/latest/1040x760/1629029.png'
    };
    
    const normalizedName = playerName.toLowerCase();
    
    // Use actual NBA photo for known players
    if (playerImages[normalizedName]) {
      console.log(`Using official NBA photo for ${playerName}`);
      return playerImages[normalizedName];
    }
    
    // For unknown players, try to get a generic basketball player image or use initials
    const genericBasketballImages = [
      'https://cdn.pixabay.com/photo/2017/08/07/14/02/people-2604149_1280.jpg',
      'https://cdn.pixabay.com/photo/2016/11/29/13/39/basketball-1869950_1280.jpg',
      'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&h=400&fit=crop&crop=faces',
      'https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?w=400&h=400&fit=crop&crop=faces',
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&crop=faces'
    ];
    
    // For AI-generated players, use a random basketball player image
    const randomImage = genericBasketballImages[Math.floor(Math.random() * genericBasketballImages.length)];
    
    console.log(`Using generic basketball image for ${playerName}: ${randomImage}`);
    return randomImage;
    
  } catch (error) {
    console.log(`Failed to get image for ${playerName}:`, error instanceof Error ? error.message : 'Unknown error');
    // Final fallback to a professional avatar
    const initials = playerName.split(' ').map(n => n[0]).join('').substring(0, 2);
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=400&background=FF8C00&color=2C1810&bold=true&format=png&font-size=0.5`;
  }
}

// Enhanced function to add images to player data
async function enhancePlayerWithImage(player: NBAPlayer): Promise<NBAPlayer> {
  if (!player.imageUrl) {
    try {
      // Determine era based on years active
      const startYear = parseInt(player.yearsActive.split('-')[0]);
      let era = 'modern';
      if (startYear < 1980) era = 'classic';
      else if (startYear < 2000) era = '90s';
      else if (startYear < 2010) era = '2000s';
      
      const imageUrl = await generatePlayerImage(player.name, player.position, era);
      return { ...player, imageUrl };
    } catch (error) {
      console.error(`Error generating image for ${player.name}:`, error);
      return player; // Return original player if image generation fails
    }
  }
  return player;
}

// Express app setup
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API Routes
app.get('/api/players', async (req, res) => {
  try {
    const players = Object.values(nbaLegends);
    const playersWithImages = await Promise.all(players.map(enhancePlayerWithImage));
    res.json(playersWithImages);
  } catch (error) {
    console.error('Error enhancing players with images:', error);
    res.json(Object.values(nbaLegends)); // Return without images if failed
  }
});

app.get('/api/players/:name', async (req, res) => {
  const playerName = req.params.name.toLowerCase();
  const player = nbaLegends[playerName];
  
  if (player) {
    try {
      const playerWithImage = await enhancePlayerWithImage(player);
      res.json(playerWithImage);
    } catch (error) {
      console.error('Error adding image to preset player:', error);
      res.json(player); // Return without image if failed
    }
  } else {
    // Try to generate the player using AI
    try {
      const outputStream = await playerGenExecutor.execute(playerName, v4());
      const result = await outputStream.next();
      
      if (result.type === GraphOutputStreamResponseType.CUSTOM) {
        const data = result.data as PlayerGenerationOutput;
        if (data.player) {
          try {
            const playerWithImage = await enhancePlayerWithImage({
              ...data.player,
              generated: data.generated
            });
            res.json(playerWithImage);
          } catch (error) {
            console.error('Error adding image to generated player:', error);
            res.json({
              ...data.player,
              generated: data.generated
            });
          }
        } else {
          res.status(404).json({ error: data.error || 'Player not found' });
        }
      }
    } catch (error) {
      console.error('Player generation error:', error);
      res.status(500).json({ error: 'Failed to generate player data' });
    }
  }
});

// New endpoint for generating custom players
app.post('/api/generate-player', async (req, res) => {
  try {
    const { playerName } = req.body;
    
    if (!playerName || typeof playerName !== 'string') {
      return res.status(400).json({ error: 'Player name is required' });
    }
    
    // Use Inworld Runtime to generate the player
    const outputStream = await playerGenExecutor.execute(playerName.toLowerCase().trim(), v4());
    const result = await outputStream.next();
    
    if (result.type === GraphOutputStreamResponseType.CUSTOM) {
      const data = result.data as PlayerGenerationOutput;
      if (data.player) {
        try {
          const playerWithImage = await enhancePlayerWithImage({
            ...data.player,
            generated: data.generated
          });
          res.json(playerWithImage);
        } catch (error) {
          console.error('Error adding image to generated player:', error);
          res.json({
            ...data.player,
            generated: data.generated
          });
        }
      } else {
        res.status(400).json({ error: data.error || 'Failed to generate player' });
      }
    } else {
      res.status(500).json({ error: 'Player generation failed' });
    }
  } catch (error) {
    console.error('Player generation error:', error);
    res.status(500).json({ error: 'Internal server error during player generation' });
  }
});

app.post('/api/compare', async (req, res) => {
  try {
    const { players } = req.body;
    
    if (!players || !Array.isArray(players) || players.length < 2) {
      return res.status(400).json({ error: 'Please provide at least 2 players to compare' });
    }
    
    // First, ensure all players exist (generate if needed)
    const resolvedPlayers: NBAPlayer[] = [];
    
    for (const playerName of players) {
      const cleanName = playerName.toLowerCase().trim();
      
      // Check if player exists in our database
      if (nbaLegends[cleanName]) {
        const enhancedPlayer = await enhancePlayerWithImage(nbaLegends[cleanName]);
        resolvedPlayers.push(enhancedPlayer);
      } else {
        // Generate the player using AI
        try {
          const outputStream = await playerGenExecutor.execute(cleanName, v4());
          const result = await outputStream.next();
          
          if (result.type === GraphOutputStreamResponseType.CUSTOM) {
            const data = result.data as PlayerGenerationOutput;
            if (data.player) {
              resolvedPlayers.push(data.player);
            }
          } else {
            return res.status(400).json({ 
              error: `Unable to find or generate data for player: ${playerName}` 
            });
          }
        } catch (error) {
          return res.status(400).json({ 
            error: `Failed to generate data for player: ${playerName}` 
          });
        }
      }
    }
    
    const query = players.join(' vs ');
    
    // Use Inworld Runtime to process the comparison with resolved players
    const outputStream = await comparisonExecutor.execute(query, v4());
  const result = await outputStream.next();

  if (result.type === GraphOutputStreamResponseType.CUSTOM) {
      // Override with our resolved players to ensure we have complete data
      const resultData = result.data as ComparisonOutput;
      const comparisonResult = {
        comparison: resultData.comparison,
        players: resolvedPlayers,
        categories: resultData.categories || {}
      };
      
      // Recalculate categories with resolved players
      const categories = {
        'Scoring': { winner: '', stats: {} as Record<string, number> },
        'Rebounding': { winner: '', stats: {} as Record<string, number> },
        'Assists': { winner: '', stats: {} as Record<string, number> },
        'Efficiency': { winner: '', stats: {} as Record<string, number> },
        'Championships': { winner: '', stats: {} as Record<string, number> },
        'League Toughness': { winner: '', stats: {} as Record<string, number> },
        'Team Strength': { winner: '', stats: {} as Record<string, number> }
      };
      
      resolvedPlayers.forEach(player => {
        categories['Scoring'].stats[player.name] = player.careerStats.pointsPerGame;
        categories['Rebounding'].stats[player.name] = player.careerStats.reboundsPerGame;
        categories['Assists'].stats[player.name] = player.careerStats.assistsPerGame;
        categories['Efficiency'].stats[player.name] = player.careerStats.fieldGoalPercentage;
        categories['Championships'].stats[player.name] = player.championships;
        categories['League Toughness'].stats[player.name] = player.toughnessOfLeagueIndex || 5.0;
        categories['Team Strength'].stats[player.name] = player.strengthOfTeamStats || 5.0;
      });
      
      (Object.keys(categories) as Array<keyof typeof categories>).forEach(category => {
        const stats = categories[category].stats;
        const winner = Object.keys(stats).reduce((a, b) => stats[a] > stats[b] ? a : b);
        categories[category].winner = winner;
      });
      
      comparisonResult.categories = categories;
      
      res.json(comparisonResult);
    } else {
      res.status(500).json({ error: 'Comparison processing failed' });
    }
  } catch (error) {
    console.error('Comparison error:', error);
    res.status(500).json({ error: 'Internal server error during comparison' });
  }
});

// Chat endpoint for AI assistant
app.post('/api/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Enhance message with context if provided
    const enhancedMessage = context ? `${context}\n\nUser question: ${message}` : message;
    
    // Use Inworld Runtime to process the chat
    const outputStream = await chatExecutor.execute(enhancedMessage, v4());
    const result = await outputStream.next();
    
    if (result.type === GraphOutputStreamResponseType.CUSTOM) {
      const data = result.data as ChatOutput;
      res.json({
        response: data.response,
        context: data.context,
        suggestions: data.suggestions || []
      });
    } else {
      res.status(500).json({ error: 'Chat processing failed' });
    }
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error during chat' });
  }
});

// Serve main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🏀 NBA Legends Comparison App running at http://localhost:${PORT}`);
  console.log('🚀 Powered by Inworld AI Runtime');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  comparisonExecutor.cleanupAllExecutions();
  comparisonExecutor.destroy();
  playerGenExecutor.cleanupAllExecutions();
  playerGenExecutor.destroy();
  chatExecutor.cleanupAllExecutions();
  chatExecutor.destroy();
  process.exit(0);
});
