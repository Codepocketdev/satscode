# SatsCode

**Bitcoin Builders Guild**

A decentralized social platform for Bitcoin and Nostr developers — built on open protocols, owned by no one, accessible to all.

---

## What is SatsCode

SatsCode is a guild for builders. A place where developers working in the Bitcoin ecosystem can publish their work, discover bounties, coordinate with peers, and earn sats for shipping real software.

It is not a company. There is no central server. No one holds your data. Everything runs on Nostr — an open, censorship-resistant messaging protocol — and Bitcoin's Lightning Network for payments.

If you build on Bitcoin, this is your home.

---

## Core Concepts

**Nostr**
An open protocol for decentralized communication. Every post, profile, follow, and message on SatsCode is a Nostr event — a cryptographically signed JSON object published to relays. Your identity is a keypair. Your content belongs to you.

**Relays**
Servers that store and distribute Nostr events. SatsCode connects to multiple relays simultaneously. If one goes down, the others carry on. You can add your own relays in Settings.

**npub / nsec**
Your Nostr identity. `npub` is your public key — share it freely. `nsec` is your private key — never share it. SatsCode stores your nsec locally on your device only.

**Sats**
Satoshis — the smallest unit of Bitcoin. One Bitcoin equals 100,000,000 sats. Bounties on SatsCode are denominated in sats and paid via Lightning Network zaps.

**Zaps**
Lightning Network payments attached to Nostr events. When someone zaps your post, they send sats directly to your Lightning wallet. No intermediary, no fees beyond the network.

**Bounties**
Tasks posted by builders or organisations with a sat reward attached. Anyone can apply. The poster reviews applicants, checks their work, and accepts one. Payment is coordinated via DM or zap.

**Kind**
Every Nostr event has a kind number that describes what it is. Kind 1 is a text post. Kind 3 is a follow list. Kind 4 is an encrypted direct message. SatsCode uses standard kinds so your content is readable by any Nostr client.

---

## Features

**Guild Feed** — A live stream of posts tagged `#satscode`. Ships, bounties, milestones, and builds from the community. Powered by WebSocket subscriptions to Nostr relays.

**Registry** — A curated directory of Bitcoin builders. Verified by the community via the `#satscode-registry` tag. Each entry links to GitHub, Lightning address, and Nostr profile.

**Bounties** — Post tasks with sat rewards. Applicants submit pitches. Posters review profiles, check GitHub work, and accept the right builder. The full flow is on-chain via Nostr events.

**Direct Messages** — End-to-end encrypted messaging via NIP-04. Only you and the recipient can read the conversation.

**Builder Profiles** — Full profiles with GitHub repository integration, skill tags, follow counts, and zap support. Pulled live from Nostr and the GitHub API.

**Proof of Work** — A feed dedicated to builders shipping in public. Post your progress, share your builds, document the process.

---

## Technology

| Layer | Technology |
|---|---|
| Protocol | Nostr (NIPs 01, 02, 04, 09, 42, 98) |
| Payments | Bitcoin Lightning Network |
| Frontend | React + Vite |
| Identity | secp256k1 keypairs via nostr-tools |
| Storage | Nostr relays (decentralized) |
| Media | nostr.build (NIP-98 authenticated uploads) |

---

## Running Locally

```bash
git clone https://github.com/Codepocketdev/satscode.git
cd satscode
npm install
npm run dev
```

Requires Node 18 or higher.

---

## Relays

SatsCode connects to the following relays by default:

```
wss://relay.damus.io
wss://nos.lol
wss://relay.nostr.band
wss://relay.primal.net
```

You can add or remove relays in Settings. Changes apply after refresh.

---

## Contributing

SatsCode is open source. If you find a bug, have a feature idea, or want to ship something — open an issue or a pull request. Better yet, post a bounty on the platform itself.

---

## License

MIT

---

*// EST. 2025 · BITCOIN ONLY*

