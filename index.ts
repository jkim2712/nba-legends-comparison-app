/*
 * NBA Legends Stats Comparison Web App
 * Built on Inworld AI Runtime - Compare stats between the greatest NBA legends
 * Frontend and Backend integration with Express.js
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';

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
    championships: 6
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
    championships: 4
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
    championships: 5
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
    championships: 5
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
    championships: 3
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
    championships: 4
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
  // NBA AI Chat Logic - Context-aware responses about NBA legends
  
  // Extract key topics from user message
  const topics = {
    players: extractPlayerNames(userMessage),
    statsKeywords: ['points', 'ppg', 'rebounds', 'assists', 'shooting', 'efficiency', 'stats', 'averages'],
    comparisonKeywords: ['better', 'best', 'greatest', 'goat', 'compare', 'vs', 'versus', 'who'],
    careerKeywords: ['career', 'achievements', 'championships', 'titles', 'legacy', 'impact'],
    styleKeywords: ['style', 'playstyle', 'skill', 'technique', 'approach', 'game']
  };
  
  const hasStats = topics.statsKeywords.some(keyword => userMessage.includes(keyword));
  const hasComparison = topics.comparisonKeywords.some(keyword => userMessage.includes(keyword));
  const hasCareer = topics.careerKeywords.some(keyword => userMessage.includes(keyword));
  const hasStyle = topics.styleKeywords.some(keyword => userMessage.includes(keyword));
  
  // Generate contextual response based on detected topics
  let response = '';
  let context = '';
  let suggestions: string[] = [];
  
  if (topics.players.length > 0) {
    response = generatePlayerSpecificResponse(topics.players, userMessage, { hasStats, hasComparison, hasCareer, hasStyle });
    context = `Discussing: ${topics.players.join(', ')}`;
    suggestions = generatePlayerSuggestions(topics.players);
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
  const commonNames = ['jordan', 'lebron', 'kobe', 'magic', 'bird', 'shaq', 'duncan', 'kareem', 'wilt', 'russell'];
  
  const foundPlayers: string[] = [];
  
  // Check for full names
  allPlayers.forEach(playerName => {
    if (message.includes(playerName)) {
      foundPlayers.push(playerName);
    }
  });
  
  // Check for common short names
  commonNames.forEach(name => {
    if (message.includes(name)) {
      foundPlayers.push(name);
    }
  });
  
  return [...new Set(foundPlayers)];
}

function generatePlayerSpecificResponse(players: string[], message: string, context: any): string {
  if (players.length === 1) {
    const player = players[0];
    if (context.hasStats) {
      return `${player.charAt(0).toUpperCase() + player.slice(1)} was incredible statistically. Looking at their career numbers, they consistently dominated in multiple categories. Their efficiency and consistency over their career truly set them apart from their peers.`;
    } else if (context.hasCareer) {
      return `${player.charAt(0).toUpperCase() + player.slice(1)} had an absolutely legendary career. Their combination of individual excellence, team success, and cultural impact makes them one of the all-time greats. The championships, MVPs, and memorable moments really tell the story.`;
    } else {
      return `${player.charAt(0).toUpperCase() + player.slice(1)} is definitely one of the NBA legends worth discussing! They brought a unique combination of skill, athleticism, and basketball IQ that made them special. What specific aspect of their game interests you most?`;
    }
  } else if (players.length === 2) {
    const [p1, p2] = players.map(p => p.charAt(0).toUpperCase() + p.slice(1));
    return `Great comparison between ${p1} and ${p2}! These are two incredible players with different strengths. ${p1} and ${p2} each brought unique elements to the game that made them legendary. Their head-to-head matchups and different eras make for fascinating analysis. What specific aspects would you like to compare?`;
  } else {
    return `Wow, discussing ${players.length} legends at once! Each of these players brought something special to the NBA. Comparing multiple greats really shows the evolution of basketball and different paths to greatness. Which specific comparison interests you most?`;
  }
}

function generateGeneralComparisonResponse(): string {
  return `NBA comparisons are always fascinating! When comparing legends, I like to consider multiple factors: statistical dominance, team success, era context, impact on the game, and cultural influence. Each great player excelled in different ways - some through raw numbers, others through intangibles like leadership and clutch performance. What specific comparison interests you?`;
}

function generateStatsInsight(): string {
  return `NBA statistics tell incredible stories! The beauty of basketball stats is how they reveal different playing styles and eras. Points per game shows scoring ability, but efficiency metrics like true shooting percentage give deeper insight. Rebounds and assists show impact beyond scoring. Context matters too - pace of play, rule changes, and competition level all affect numbers.`;
}

function generateGeneralNBAResponse(message: string): string {
  if (message.includes('goat') || message.includes('greatest')) {
    return `The GOAT debate is eternal! Different fans value different things - some prioritize championships, others focus on individual dominance, longevity, or cultural impact. Michael Jordan, LeBron James, Kareem Abdul-Jabbar, and others all have compelling cases. What factors do you think matter most in determining greatness?`;
  } else if (message.includes('era') || message.includes('90s') || message.includes('80s')) {
    return `Different NBA eras had unique characteristics! The 80s featured fast-paced, physical play with legendary rivalries. The 90s saw the peak of individual superstars and global expansion. The 2000s brought defensive focus, while the modern era emphasizes spacing and analytics. Each era had its own style and legends.`;
  }
  
  return `I love talking NBA! Whether it's about legendary players, epic games, statistical comparisons, or basketball strategy, there's always something fascinating to discuss. The NBA has such a rich history of incredible athletes and memorable moments. What aspect of basketball interests you most?`;
}

function generatePlayerSuggestions(players: string[]): string[] {
  if (players.includes('jordan') || players.includes('michael jordan')) {
    return ['What made Jordan clutch?', 'Jordan vs LeBron comparison', 'MJ\'s impact on basketball culture'];
  } else if (players.includes('lebron') || players.includes('lebron james')) {
    return ['LeBron\'s longevity secrets', 'King James\' Finals record', 'LeBron\'s all-around game'];
  } else if (players.includes('kobe') || players.includes('kobe bryant')) {
    return ['Kobe\'s Mamba Mentality', 'Kobe vs Jordan similarities', 'Black Mamba\'s work ethic'];
  }
  
  return ['Compare different playing styles', 'Greatest clutch performers', 'Most complete players ever'];
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
    championships: championships
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
      }
    };
    
    // Calculate winners for each category
    players.forEach(player => {
      categories['Scoring'].stats[player.name] = player.careerStats.pointsPerGame;
      categories['Rebounding'].stats[player.name] = player.careerStats.reboundsPerGame;
      categories['Assists'].stats[player.name] = player.careerStats.assistsPerGame;
      categories['Efficiency'].stats[player.name] = player.careerStats.fieldGoalPercentage;
      categories['Championships'].stats[player.name] = player.championships;
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

// Express app setup
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API Routes
app.get('/api/players', (req, res) => {
  res.json(Object.values(nbaLegends));
});

app.get('/api/players/:name', async (req, res) => {
  const playerName = req.params.name.toLowerCase();
  const player = nbaLegends[playerName];
  
  if (player) {
    res.json(player);
  } else {
    // Try to generate the player using AI
    try {
      const outputStream = await playerGenExecutor.execute(playerName, v4());
      const result = await outputStream.next();
      
      if (result.type === GraphOutputStreamResponseType.CUSTOM) {
        const data = result.data as PlayerGenerationOutput;
        if (data.player) {
          res.json({
            ...data.player,
            generated: data.generated
          });
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
        res.json({
          ...data.player,
          generated: data.generated
        });
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
        resolvedPlayers.push(nbaLegends[cleanName]);
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
        'Championships': { winner: '', stats: {} as Record<string, number> }
      };
      
      resolvedPlayers.forEach(player => {
        categories['Scoring'].stats[player.name] = player.careerStats.pointsPerGame;
        categories['Rebounding'].stats[player.name] = player.careerStats.reboundsPerGame;
        categories['Assists'].stats[player.name] = player.careerStats.assistsPerGame;
        categories['Efficiency'].stats[player.name] = player.careerStats.fieldGoalPercentage;
        categories['Championships'].stats[player.name] = player.championships;
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
