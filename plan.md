# Deck Salone — New Features Plan (CUEUP-style)

## Overview
Add gig/opportunity marketplace, enhanced DJ profile settings, testimonials, venues, and website embeds to the existing Deck Salone platform. **Do NOT replace existing features** — upgrade where similar, add new where missing.

## Database Schema (Done ✅)

### New Models
- `Gig` — Event organizers post gigs with detailed requirements
- `GigOffer` — DJs send offers for gigs
- `DjService` — Services DJ offers with pricing
- `DjAvailability` — Calendar of available dates
- `Testimonial` — Customer testimonials
- `Venue` — Venues DJ has performed at
- `EmbedConfig` — Website embed configurations
- `DjEventType` — Event types DJ performs at

### Updated Models
- `DjProfile` — Added: `customUrl`, `artistType`, `eventTypes`, `cancellationPolicy`, `equipmentDetails`
- `Booking` — Added: `cancellationPolicy`, `cancellationDeadline`, `cancellationReason`, `offerSentBy`, `negotiationHistory`
- `Review` — Added: `isTestimonial`, `eventName`, `venue`, `eventDate`

## Backend API Requirements

### 1. Gigs & Offers (`app/api/routes/gigs.ts`)
- `GET /api/gigs` — List gigs (filter by city, eventType, budget, date, status=open)
- `POST /api/gigs` — Organizer creates a gig (auth required, role=USER)
- `GET /api/gigs/:id` — Gig detail with organizer info
- `PUT /api/gigs/:id` — Organizer updates their gig
- `DELETE /api/gigs/:id` — Organizer deletes/cancels gig
- `POST /api/gigs/:id/offers` — DJ sends an offer (auth required, role=DJ)
- `GET /api/gigs/:id/offers` — List offers on a gig (organizer sees all, DJ sees own)
- `PUT /api/gigs/:id/offers/:offerId` — Accept/decline/counter an offer
- `PUT /api/gigs/:id/offers/:offerId/withdraw` — DJ withdraws offer
- `GET /api/djs/me/gigs` — DJ's gig offers (sent and status)
- `GET /api/users/me/gigs` — Organizer's posted gigs

### 2. DJ Profile Settings (`app/api/routes/dj-settings.ts`)
- `GET /api/djs/me/services` — DJ's services
- `POST /api/djs/me/services` — Add service
- `PUT /api/djs/me/services/:id` — Update service
- `DELETE /api/djs/me/services/:id` — Remove service
- `GET /api/djs/me/availability` — DJ's availability calendar
- `POST /api/djs/me/availability` — Add availability entry
- `DELETE /api/djs/me/availability/:id` — Remove availability
- `GET /api/djs/me/cancellation` — DJ's cancellation policy
- `PUT /api/djs/me/cancellation` — Update cancellation policy
- `GET /api/djs/me/custom-url` — Check custom URL availability
- `PUT /api/djs/me/custom-url` — Set custom URL
- `GET /api/djs/me/event-types` — DJ's event types
- `PUT /api/djs/me/event-types` — Update event types
- `GET /api/djs/me/testimonials` — DJ's testimonials
- `POST /api/djs/me/testimonials` — Add testimonial
- `DELETE /api/djs/me/testimonials/:id` — Remove testimonial
- `GET /api/djs/me/venues` — DJ's venues
- `POST /api/djs/me/venues` — Add venue
- `DELETE /api/djs/me/venues/:id` — Remove venue

### 3. Public Embeds (`app/api/routes/embeds.ts`)
- `GET /api/embeds/:token` — Public embed data (no auth)
- `GET /api/djs/me/embeds` — List DJ's embed configs
- `POST /api/djs/me/embeds` — Create embed config
- `DELETE /api/djs/me/embeds/:id` — Delete embed config

### 4. Updated Existing Routes
- `GET /api/djs/:identifier` — Include testimonials, venues, services, event types
- `GET /api/bookings/:id` — Include cancellation policy and negotiation history

## Frontend Requirements

### 1. DJ Profile Settings Page (`/dashboard/settings`)
**Left sidebar navigation** (matching CUEUP style):
- **PROFILE**: About you, Artist type, Photos and videos, Music and mixes, Testimonials, Custom link, BioLink, Website embeds
- **PRICING**: Your price, Services
- **EVENT TARGETING**: Locations, Event types
- **BOOKING**: Availability, Cancellation policy

**Right panel content** for each section:
- Artist type: Radio buttons (DJ, Band, Solo musician) + genre selector
- Testimonials: List with add form (client name, event type, text, rating)
- Venues: List with add form (name, city, country, event type, date)
- Custom link: Input for vanity URL + preview button
- Pricing: Base price range + services list with add/edit/delete
- Services: Name, description, price, price type (fixed/hourly/per-event)
- Availability: Calendar view with available/busy dates
- Cancellation policy: Text editor + preset templates
- Event types: Multi-select checkboxes (Wedding, Corporate, Birthday, Club, Festival, etc.)
- Website embeds: Cards for Reviews, Mixtape, Book Now, Booking Form with copy-paste code

### 2. Gig/Opportunity System
- **Gigs page** (`/gigs`) — List of open gigs with filters (city, event type, budget, date)
- **Gig detail page** (`/gigs/:id`) — Full gig info with:
  - Right sidebar: Booking workflow (Send offer → Booking confirmation → Receive payout → Review)
  - "Send offer" button for DJs
  - "Pass opportunity" button
  - Description, venue, date, time, location, guests, budget, event type, music
- **Post gig page** (`/gigs/post`) — Form for organizers to post gigs
- **My gigs page** (`/dashboard/gigs`) — DJ's sent offers + organizer's posted gigs

### 3. DJ Public Profile Updates
- Show testimonials section with client name, event type, text, rating
- Show venues section with list of performed venues
- Show services and pricing
- Show event types DJ performs at
- Show "Book Now" button prominently

### 4. Website Embed Widgets
- **Reviews widget** — Embeddable HTML/JS that shows DJ's testimonials
- **Mixtape widget** — Embeddable player showing DJ's mixes
- **Book Now button** — Embeddable button that links to booking page
- **Booking Form** — Embeddable iframe form for direct booking

## Styling Notes
- Use existing Deck Salone dark theme (black/gold)
- Keep sidebar navigation consistent with existing dashboard
- Use existing form components and styling patterns
- All new pages should match the existing dark theme

## Key Files to Create/Modify

### Backend
- `app/api/routes/gigs.ts` — NEW
- `app/api/routes/dj-settings.ts` — NEW
- `app/api/routes/embeds.ts` — NEW
- `app/api/server.ts` — ADD routes
- `app/api/prisma/schema.prisma` — DONE ✅

### Frontend
- `app/src/pages/dashboard/Settings.tsx` — MAJOR UPDATE
- `app/src/pages/gigs/` — NEW directory with listing, detail, post pages
- `app/src/pages/dj/Gigs.tsx` — NEW (DJ's gig management)
- `app/src/pages/Gigs.tsx` — NEW (public gig listing)
- `app/src/pages/GigDetail.tsx` — NEW (public gig detail)
- `app/src/components/DjTestimonials.tsx` — NEW
- `app/src/components/DjVenues.tsx` — NEW
- `app/src/components/DjServices.tsx` — NEW
- `app/src/components/EmbedWidgets.tsx` — NEW
- `app/src/hooks/useGigs.ts` — NEW
- `app/src/hooks/useDjSettings.ts` — NEW
- `app/src/App.tsx` — ADD routes

## Implementation Order
1. Backend API (parallel)
2. Frontend Settings (parallel with gig pages)
3. Frontend Gig system
4. Frontend Profile display updates
5. Frontend Embed widgets
6. Build and test
