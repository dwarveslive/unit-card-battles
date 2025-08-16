# Unit Card Battles - Multiplayer Setup

This is a multiplayer card battle game built with React frontend and Node.js WebSocket server.

## Features

- **Real-time Multiplayer**: Up to 6 players can join a game room
- **Synchronized Game State**: All players see the same game state in real-time
- **Room System**: Create private rooms with shareable room IDs
- **Full Game Logic**: Complete implementation of the card battle game
- **Responsive UI**: Modern, polished interface with game lobbies

## Setup Instructions

### 1. Install Dependencies

First, install the frontend dependencies:
```bash
npm install
```

Then install the server dependencies:
```bash
cd server
npm install
cd ..
```

### 2. Start the Server

In a terminal, navigate to the server directory and start the WebSocket server:
```bash
cd server
npm run dev
```

The server will start on `http://localhost:3000`

### 3. Start the Frontend

In another terminal, from the root directory, start the React frontend:
```bash
npm run dev
```

The frontend will start on `http://localhost:8080`

## How to Play

### Creating/Joining a Room

1. **Create Room**: Enter your player name and click "Create New Room"
   - You'll get a room ID to share with friends
   - You become the host and can start the game

2. **Join Room**: Enter your player name and the room ID, then click "Join Room"
   - You'll join the lobby and wait for the host to start

### Game Flow

1. **Lobby**: Wait for 2-6 players to join, then the host can start the game
2. **Draw Phase**: Draw 2 cards from deck/discard pile
3. **Play Phase**: 
   - Play units (3+ cards of same color or white + another color)
   - Choose to attack or discard
4. **Attack Phase**: Attack enemy units with your cards
5. **Reinforce Phase**: Add cards to existing units
6. **Discard Phase**: Discard cards to end turn

### Win Condition

- Reach 50+ total unit value to trigger the final turn
- If the triggering player doesn't have 50+ points by their next turn, the game continues
- If another player reaches 50+ points and the original triggering player loses their 50+ point lead, then the game continues until the new player who triggered the last round has their turn.
- Score = Unit values - Graveyard penalty

## Game Rules

### Unit Formation
- Combine 3+ cards of the same color
- OR combine white cards with cards of another single color
- Black and white cards cannot be combined

### Battle System
- Cards have power (1-5) and special abilities
- Higher power wins battles
- Abilities modify power (e.g., +1 when attacking)
- Winner can "kidnap" a card from the losing unit

### Card Abilities
- `+1 when attacking/defending`: Power bonus in combat
- `Double power vs red/blue`: Double power against specific colors
- `Draw 1 card`, `Discard 1 card`: Hand manipulation
- And many more strategic abilities

## Architecture

### Frontend (`src/`)
- **React + TypeScript**: Modern frontend framework
- **Socket.IO Client**: Real-time communication
- **Tailwind CSS + shadcn/ui**: Styling and components
- **Component Structure**:
  - `MultiplayerGameManager`: Main app controller
  - `RoomConnection`: Lobby/room creation interface
  - `GameLobby`: Waiting room before game starts
  - `GameBoard`: Main game interface
  - `WebSocketService`: Server communication

### Backend (`server/src/`)
- **Node.js + Express**: Web server
- **Socket.IO**: WebSocket server for real-time communication
- **Game Logic**: Server-side validation and state management
- **Room Management**: Handle multiple game rooms simultaneously

## Development

### Frontend Development
```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run lint       # Run linter
```

### Server Development
```bash
cd server
npm run dev        # Start with nodemon (auto-restart)
npm start          # Start production server
```

## Deployment

### Frontend
The frontend is a standard Vite React app and can be deployed to any static hosting service (Vercel, Netlify, etc.).

### Server
The server is a Node.js app that can be deployed to any Node.js hosting service (Railway, Render, Heroku, etc.).

**Important**: Update the WebSocket server URL in `src/services/websocket.ts` when deploying:
```typescript
// Change from localhost to your deployed server URL
this.socket = io('https://your-server-domain.com');
```

## Troubleshooting

### Connection Issues
- Make sure the server is running on port 3000
- Check that there are no firewall issues
- Verify the frontend is connecting to the correct server URL

### Game Issues
- Check browser console for error messages
- Ensure all players are using the same version
- Server logs will show game state issues

### Performance
- The server stores all game state in memory
- For production, consider using Redis for state storage
- Implement reconnection logic for unstable connections

## Future Enhancements

- [ ] Spectator mode
- [ ] Game replay system
- [ ] Tournament brackets
- [ ] Custom card abilities
- [ ] AI opponents
- [ ] Mobile app version
- [ ] Game statistics and leaderboards

Enjoy playing Unit Card Battles!
