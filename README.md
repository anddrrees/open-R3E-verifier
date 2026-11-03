# open-R3E-verifier

A community-oriented Discord bot for linking **RaceRoom Racing Experience (R3E)** player profiles to Discord accounts.

The bot generates a temporary verification token, asks the player to place it in their RaceRoom profile name, and checks RaceRoom's public multiplayer-rating data for that token. Once a match is found, the Discord account is linked to the RaceRoom player and the bot can assign the server's verified role.

> **Project status:** This repository is provided as an open-source starting point for league owners and developers who want to adapt the idea to their own communities. It is an unfinished, community-reusable project supplied **as-is**, not a hosted verification service or a guaranteed production-ready package. Fork it, inspect it, and adapt it to your own requirements.

## Features

- Discord slash-command interface built with `discord.js`.
- Per-server setup through `/start`.
- Automatically creates a verification category, verification channels, and the roles used by the bot.
- Generates 16-character, uppercase verification tokens.
- Checks RaceRoom player data for a profile name containing a token.
- Stores Discord-to-RaceRoom account links in SQLite.
- Assigns a server-specific verified role after successful verification.
- Includes an admin-restricted `/list` command for viewing verified members.
- Uses an in-memory RaceRoom player index to avoid fetching the full player list for every lookup.

## How verification works

1. A server administrator runs `/start`.
2. A member runs `/verify`.
3. The bot creates a temporary 16-character token and displays it in an ephemeral Discord response.
4. The member edits their RaceRoom profile name and places the token in the **first-name field**.
5. The member returns to Discord and presses **I'm ready!**.
6. The bot searches RaceRoom's multiplayer-rating data for the token.
7. If it finds one matching player, it saves the RaceRoom user ID and displayed name against the Discord account, then assigns the server's verified role.
8. If the first lookup does not find the token, the interactive command waits one minute and retries. If it is still not found, the pending token remains available for the background verification cycle.

The RaceRoom profile must be visible in the data returned by the endpoint. The setup instructions currently advise members to complete at least one race before attempting verification.

### Background verification

The bot also runs a background cycle every 30 minutes while it is online. The cycle refreshes the player index and checks accounts that still have a pending token.

The player index is cached for up to 20 minutes during normal lookups. The background cycle explicitly invalidates that cache before refreshing it.

> The actual lookup implementation currently indexes the **first word** of `Fullname`. Although some user-facing instructions mention either the first or last name, the current code should be treated as supporting the first-name token placement only unless you modify and test the matching logic.

## Discord commands

| Command | Purpose | Access |
|---|---|---|
| `/start` | Creates or repairs the server's verification channels and roles, then stores the server configuration. | Discord server administrator |
| `/verify` | Starts verification or restores the verified role for an already-linked account. | Server members |
| `/how-to` | Displays the verification instructions. | Server members |
| `/list` | Lists linked RaceRoom accounts whose Discord members are present in the server. | Bot-created League Admin role |
| `/ping` | Tests outbound TCP connectivity to `google.com` on port 80 and reports the connection latency. | Server members |

The account link is stored against the Discord user, while the verified role is configured per Discord server. This means the same linked Discord account can receive the configured verified role in another server where the bot has been set up.

## Architecture

The project is a small **Node.js / CommonJS** application. Its main parts are:

```text
open-R3E-verifier/
├── commands/
│   └── utilities/
│       ├── howto.js       # Verification instructions
│       ├── list.js        # Admin view of verified members
│       ├── ping.js        # Basic connectivity check
│       ├── start.js       # Per-server Discord setup
│       └── verify.js      # Interactive account verification
├── core-utils/
│   ├── cycle.js           # Periodic processing of pending verifications
│   ├── db.js              # SQLite connection and table creation
│   ├── script.js          # RaceRoom fetch, cache and player indexes
│   └── token.js           # Temporary verification-token generation
├── config.json            # Local Discord credentials (not committed)
├── deploy-commands.js     # Registers Discord slash commands
├── index.js               # Discord client and application entry point
├── package.json
└── package-lock.json
```

### Main components

- **`index.js`** creates the Discord client, loads command modules, dispatches slash-command interactions, primes the token pool and player cache, and starts the 30-minute background cycle.
- **`commands/utilities/`** contains the Discord-facing commands.
- **`core-utils/token.js`** generates 16-character uppercase tokens using Node's cryptographic random-byte generator and maintains an in-memory pool.
- **`core-utils/script.js`** fetches `https://game.raceroom.com/multiplayer-rating/ratings.json`, builds indexes for player names and IDs, and caches the result.
- **`core-utils/cycle.js`** revisits pending verifications and refreshes stored RaceRoom display names for linked accounts.
- **`core-utils/db.js`** opens the local SQLite database and creates the `users` and `guilds` tables when they do not already exist.

### Data storage

The SQLite database is created automatically at:

```text
core-utils/database.db
```

It contains two tables:

- **`users`** stores the Discord user ID, pending token, RaceRoom user ID, RaceRoom display name and verification timestamp. The account link is global to the Discord user, rather than duplicated per server.
- **`guilds`** stores each server's verification channel, verified role, admin role, help channel and category IDs.

The database file is generated locally and is excluded from version control. Back it up before making changes to the database or moving the bot to another host.

## Requirements

- Node.js **20 or newer**.
- npm.
- A Discord application and bot account.
- A Discord server where you have permission to install and configure the bot.
- Outbound internet access to Discord and the RaceRoom ratings endpoint.
- A host capable of running `better-sqlite3` (including its native dependency requirements).

Dependencies:

- [`discord.js`](https://discord.js.org/) 14
- [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3)

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/anddrrees/open-R3E-verifier.git
cd open-R3E-verifier
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create the local configuration file

Create `config.json` in the project root:

```json
{
  "token": "YOUR_DISCORD_BOT_TOKEN",
  "clientId": "YOUR_DISCORD_APPLICATION_ID"
}
```

`config.json` is listed in `.gitignore` and should remain local. Do not commit your bot token or other credentials.

### 4. Configure the Discord application

In the Discord Developer Portal:

1. Create or select your Discord application and add a bot user.
2. Copy the bot token into `config.json`.
3. Copy the application ID into `clientId`.
4. Enable the **Server Members Intent** (the `GuildMembers` privileged gateway intent) if required for your application.
5. Invite the bot to your server with the permissions needed to create channels and roles, view channels, send messages, embed links, use application commands, and manage roles.

The bot's role must be positioned above the role it needs to assign in the server's role hierarchy. The bot also needs permission to create the category, text channels and roles during setup.

### 5. Register slash commands

Run:

```bash
node deploy-commands.js
```

The current deployment script registers commands globally through Discord's application-command route. Global command updates can take time to appear in every server.

### 6. Start the bot

```bash
npm start
```

Once the bot is online, run `/start` in the Discord server as an administrator.

## Configuration and deployment notes

- The current configuration is intentionally minimal: the bot token and application ID are stored in `config.json`.
- Server-specific channel and role IDs are generated by `/start` and persisted in SQLite.
- Keep `core-utils/database.db` between restarts. Deleting it removes stored account links and server setup records.
- The token pool and player cache are held in memory. They are rebuilt when the process starts.
- Run a single bot process against a given SQLite database unless you have reviewed and adapted the application for multi-process operation.
- The bot must remain online for the background verification cycle to run.
- The project currently has no dedicated test suite, migration framework, container setup or automated deployment pipeline.

## Current limitations and things to review before production use

This repository is deliberately left as a reusable starting point. Before deploying a fork for a league, review at least the following:

- **RaceRoom endpoint dependency:** player discovery relies on the RaceRoom multiplayer-rating JSON endpoint. Its availability, response format and coverage are outside this project's control.
- **Name matching:** the current index uses the first word of a player's `Fullname`; token placement in the last-name field is not currently implemented by the lookup logic.
- **Background-cycle notification:** the current `cycle.js` references `channel` without defining it. If a pending account is matched during the background cycle, the database update occurs first, but the subsequent notification line can throw a `ReferenceError` and interrupt that cycle. Repair this path before relying on background verification.
- **Help command:** the current `/how-to` implementation uses `db` without importing the database module. It may fail when invoked; add the missing import and test the command in a configured server.
- **Background role assignment:** the periodic cycle does not currently assign the verified Discord role after it links an account. The interactive `/verify` path does assign the role in the server where verification was started.
- **Multi-server behaviour:** account links are global to Discord users, while roles and setup are per server. Review this model if your league needs separate identities or account policies per community.
- **Operational resilience:** add endpoint timeouts, HTTP status checks, structured logging, retry/backoff behaviour and monitoring appropriate to your deployment.
- **Verification safeguards:** consider uniqueness constraints, active-token lifecycle handling, concurrency protection and explicit handling of ambiguous matches.
- **Discord permissions and hierarchy:** the bot cannot create or assign resources if its permissions or role position are insufficient.

These notes are not a claim that every deployment will encounter these issues. They are areas maintainers should understand and test against their own Discord server and RaceRoom use case.

## Contributing and forking

The project is published under the MIT License. You are welcome to fork it, adapt it for your league, experiment with alternative verification flows, or use it as a base for a larger RaceRoom community tool.

If you publish a modified version, please:

- Explain what you changed and which RaceRoom endpoint or data assumptions your fork uses.
- Keep credentials, local configuration and database files out of commits.
- Test the complete verification path, including role assignment and failure cases.
- Document any additional Discord permissions or setup steps your fork requires.

There is no promise of ongoing maintenance or support for every fork.

## License

This project is licensed under the [MIT License](LICENSE).

---

**Made for the RaceRoom community.**  
Repository: [anddrrees/open-R3E-verifier](https://github.com/anddrrees/open-R3E-verifier)
