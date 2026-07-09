--
-- PostgreSQL database dump
--

\restrict mrVRqZ3ocOWWjqDzkZ56hVzhQQAwy78uEZR19hCERfdRVk84pQYfNKgNitkV3BC

-- Dumped from database version 15.15 (Homebrew)
-- Dumped by pg_dump version 15.15 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: soundit
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO soundit;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: soundit
--

COMMENT ON SCHEMA public IS '';


--
-- Name: BookingStatus; Type: TYPE; Schema: public; Owner: soundit
--

CREATE TYPE public."BookingStatus" AS ENUM (
    'PENDING',
    'NEGOTIATING',
    'CONFIRMED',
    'DEPOSIT_PAID',
    'COMPLETED',
    'CANCELLED',
    'REFUNDED'
);


ALTER TYPE public."BookingStatus" OWNER TO soundit;

--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: soundit
--

CREATE TYPE public."PaymentStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'REFUNDED'
);


ALTER TYPE public."PaymentStatus" OWNER TO soundit;

--
-- Name: PaymentType; Type: TYPE; Schema: public; Owner: soundit
--

CREATE TYPE public."PaymentType" AS ENUM (
    'DEPOSIT',
    'FULL_PAYMENT',
    'REFUND',
    'PLATFORM_FEE'
);


ALTER TYPE public."PaymentType" OWNER TO soundit;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: soundit
--

CREATE TYPE public."Role" AS ENUM (
    'USER',
    'DJ',
    'ADMIN',
    'MODERATOR',
    'FINANCE_ADMIN',
    'VERIFICATION_ADMIN'
);


ALTER TYPE public."Role" OWNER TO soundit;

--
-- Name: UserStatus; Type: TYPE; Schema: public; Owner: soundit
--

CREATE TYPE public."UserStatus" AS ENUM (
    'ACTIVE',
    'SUSPENDED',
    'BANNED'
);


ALTER TYPE public."UserStatus" OWNER TO soundit;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: soundit
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO soundit;

--
-- Name: ad_campaigns; Type: TABLE; Schema: public; Owner: soundit
--

CREATE TABLE public.ad_campaigns (
    id text NOT NULL,
    name text NOT NULL,
    "advertiserId" text,
    "targetType" text DEFAULT 'profile'::text NOT NULL,
    "targetId" text,
    status text DEFAULT 'pending_payment'::text NOT NULL,
    budget double precision DEFAULT 0 NOT NULL,
    currency text DEFAULT 'SLE'::text NOT NULL,
    "reachScore" double precision DEFAULT 0 NOT NULL,
    spent double precision DEFAULT 0 NOT NULL,
    impressions integer DEFAULT 0 NOT NULL,
    clicks integer DEFAULT 0 NOT NULL,
    ctr double precision DEFAULT 0 NOT NULL,
    "creativeImageUrl" text,
    "ctaUrl" text,
    "startDate" timestamp(3) without time zone,
    "endDate" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.ad_campaigns OWNER TO soundit;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: soundit
--

CREATE TABLE public.audit_logs (
    id text NOT NULL,
    "actorId" text NOT NULL,
    "targetId" text,
    action text NOT NULL,
    entity text NOT NULL,
    "entityId" text,
    metadata jsonb,
    "ipAddress" text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO soundit;

--
-- Name: battle_entries; Type: TABLE; Schema: public; Owner: soundit
--

CREATE TABLE public.battle_entries (
    id text NOT NULL,
    "battleId" text NOT NULL,
    "djId" text NOT NULL,
    "mixId" text,
    "baseScore" double precision DEFAULT 0 NOT NULL,
    "voteScore" double precision DEFAULT 0 NOT NULL,
    "finalScore" double precision DEFAULT 0 NOT NULL,
    votes integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.battle_entries OWNER TO soundit;

--
-- Name: battle_votes; Type: TABLE; Schema: public; Owner: soundit
--

CREATE TABLE public.battle_votes (
    id text NOT NULL,
    "entryId" text NOT NULL,
    "userId" text NOT NULL,
    weight double precision DEFAULT 1.0 NOT NULL
);


ALTER TABLE public.battle_votes OWNER TO soundit;

--
-- Name: battles; Type: TABLE; Schema: public; Owner: soundit
--

CREATE TABLE public.battles (
    id text NOT NULL,
    title text NOT NULL,
    "weekStart" timestamp(3) without time zone NOT NULL,
    "weekEnd" timestamp(3) without time zone NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    theme text,
    "metricType" text DEFAULT 'COMPOSITE'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.battles OWNER TO soundit;

--
-- Name: bookings; Type: TABLE; Schema: public; Owner: soundit
--

CREATE TABLE public.bookings (
    id text NOT NULL,
    "clientId" text,
    "djId" text NOT NULL,
    "eventType" text NOT NULL,
    "eventDate" timestamp(3) without time zone NOT NULL,
    "eventLocation" text NOT NULL,
    duration integer NOT NULL,
    budget double precision NOT NULL,
    "finalPrice" double precision,
    deposit double precision,
    status public."BookingStatus" DEFAULT 'PENDING'::public."BookingStatus" NOT NULL,
    notes text,
    requirements text,
    rating integer,
    review text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "budgetMax" double precision,
    "budgetMin" double precision,
    "equipmentNeeded" text[] DEFAULT ARRAY[]::text[],
    "eventTypes" text[] DEFAULT ARRAY[]::text[],
    "guestEmail" text,
    "guestName" text,
    "guestPhone" text,
    "musicStyles" text[] DEFAULT ARRAY[]::text[],
    services jsonb,
    "travelNotes" text
);


ALTER TABLE public.bookings OWNER TO soundit;

--
-- Name: dj_photos; Type: TABLE; Schema: public; Owner: soundit
--

CREATE TABLE public.dj_photos (
    id text NOT NULL,
    "djId" text NOT NULL,
    url text NOT NULL,
    caption text,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "isPublic" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.dj_photos OWNER TO soundit;

--
-- Name: dj_profiles; Type: TABLE; Schema: public; Owner: soundit
--

CREATE TABLE public.dj_profiles (
    id text NOT NULL,
    "userId" text NOT NULL,
    "stageName" text NOT NULL,
    "fullName" text NOT NULL,
    bio text,
    avatar text,
    "coverBanner" text,
    country text DEFAULT 'Sierra Leone'::text NOT NULL,
    city text,
    genres text[],
    awards text[],
    equipment text[],
    languages text[] DEFAULT ARRAY['English'::text],
    "bookingFeeMin" double precision,
    "bookingFeeMax" double precision,
    currency text DEFAULT 'SLE'::text NOT NULL,
    availability text,
    website text,
    "whatsappNumber" text,
    verified boolean DEFAULT false NOT NULL,
    "isPublic" boolean DEFAULT false NOT NULL,
    "totalFollowers" integer DEFAULT 0 NOT NULL,
    "totalStreams" integer DEFAULT 0 NOT NULL,
    "totalMixes" integer DEFAULT 0 NOT NULL,
    "totalEvents" integer DEFAULT 0 NOT NULL,
    "totalBookings" integer DEFAULT 0 NOT NULL,
    "averageRating" double precision DEFAULT 0 NOT NULL,
    "rankingScore" double precision DEFAULT 0 NOT NULL,
    "digitalScore" double precision DEFAULT 0 NOT NULL,
    "industryScore" double precision DEFAULT 0 NOT NULL,
    "communityScore" double precision DEFAULT 0 NOT NULL,
    "rankingPosition" integer DEFAULT 0 NOT NULL,
    badges text[] DEFAULT ARRAY[]::text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "apiAccessEnabled" boolean DEFAULT false NOT NULL,
    "canReceivePayments" boolean DEFAULT false NOT NULL,
    "canViewAnalytics" boolean DEFAULT false NOT NULL,
    "depositPercent" integer DEFAULT 30,
    "eventTypes" text[] DEFAULT ARRAY[]::text[],
    "fullDayRate" double precision,
    "hasAccountManager" boolean DEFAULT false NOT NULL,
    "hearThisConnected" boolean DEFAULT false NOT NULL,
    "hearThisId" text,
    "hourlyRate" double precision,
    "idDocumentType" text,
    "idDocumentUrl" text,
    "isLegendFeatured" boolean DEFAULT false NOT NULL,
    "isPro" boolean DEFAULT false NOT NULL,
    "isVerifiedEligible" boolean DEFAULT false NOT NULL,
    "legalName" text,
    "maxTravelDistanceKm" integer,
    nationality text,
    services jsonb,
    "socialLinks" jsonb,
    "socialProof" text,
    "startYear" integer,
    "streamingLinks" jsonb,
    "subscriptionActivatedAt" timestamp(3) without time zone,
    "subscriptionTier" text DEFAULT 'free'::text NOT NULL,
    "totalMixUploads" integer DEFAULT 0 NOT NULL,
    "verificationNotes" text,
    "verificationReason" text,
    "verificationStatus" text DEFAULT 'unverified'::text NOT NULL,
    "verifiedAt" timestamp(3) without time zone,
    "willTravel" boolean DEFAULT false NOT NULL
);


ALTER TABLE public.dj_profiles OWNER TO soundit;

--
-- Name: events; Type: TABLE; Schema: public; Owner: soundit
--

CREATE TABLE public.events (
    id text NOT NULL,
    "djId" text,
    title text NOT NULL,
    description text,
    type text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    location text NOT NULL,
    city text NOT NULL,
    venue text,
    image text,
    "isOpenSlot" boolean DEFAULT false NOT NULL,
    slots integer DEFAULT 0 NOT NULL,
    "filledSlots" integer DEFAULT 0 NOT NULL,
    compensation double precision,
    requirements text,
    status text DEFAULT 'upcoming'::text NOT NULL,
    "soundItSaloneEventId" text,
    "soundItSaloneUrl" text,
    "isSyncedToSalone" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "ticketUrl" text
);


ALTER TABLE public.events OWNER TO soundit;

--
-- Name: follows; Type: TABLE; Schema: public; Owner: soundit
--

CREATE TABLE public.follows (
    id text NOT NULL,
    "userId" text NOT NULL,
    "djId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.follows OWNER TO soundit;

--
-- Name: gig_applications; Type: TABLE; Schema: public; Owner: soundit
--

CREATE TABLE public.gig_applications (
    id text NOT NULL,
    "gigId" text NOT NULL,
    "djId" text NOT NULL,
    "proposedPrice" double precision,
    message text,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.gig_applications OWNER TO soundit;

--
-- Name: gigs; Type: TABLE; Schema: public; Owner: soundit
--

CREATE TABLE public.gigs (
    id text NOT NULL,
    "clientName" text,
    "clientEmail" text,
    "clientPhone" text,
    "clientToken" text NOT NULL,
    "eventType" text NOT NULL,
    "eventDate" timestamp(3) without time zone NOT NULL,
    "startTime" text,
    "durationHours" integer,
    location text NOT NULL,
    city text,
    "budgetMin" double precision,
    "budgetMax" double precision,
    "musicStyles" text[] DEFAULT ARRAY[]::text[],
    "equipmentNeeded" text[] DEFAULT ARRAY[]::text[],
    notes text,
    status text DEFAULT 'OPEN'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.gigs OWNER TO soundit;

--
-- Name: messages; Type: TABLE; Schema: public; Owner: soundit
--

CREATE TABLE public.messages (
    id text NOT NULL,
    "senderId" text NOT NULL,
    "receiverId" text NOT NULL,
    content text NOT NULL,
    "bookingId" text,
    "readAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedBySender" boolean DEFAULT false NOT NULL,
    "deletedByReceiver" boolean DEFAULT false NOT NULL
);


ALTER TABLE public.messages OWNER TO soundit;

--
-- Name: mix_likes; Type: TABLE; Schema: public; Owner: soundit
--

CREATE TABLE public.mix_likes (
    id text NOT NULL,
    "mixId" text NOT NULL,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.mix_likes OWNER TO soundit;

--
-- Name: mixes; Type: TABLE; Schema: public; Owner: soundit
--

CREATE TABLE public.mixes (
    id text NOT NULL,
    "djId" text NOT NULL,
    title text NOT NULL,
    description text,
    "coverImage" text,
    "audioUrl" text,
    duration integer,
    genre text NOT NULL,
    tags text[],
    category text NOT NULL,
    plays integer DEFAULT 0 NOT NULL,
    likes integer DEFAULT 0 NOT NULL,
    downloads integer DEFAULT 0 NOT NULL,
    "isPublic" boolean DEFAULT true NOT NULL,
    featured boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "audioSource" text,
    "originalUrl" text
);


ALTER TABLE public.mixes OWNER TO soundit;

--
-- Name: opp_applications; Type: TABLE; Schema: public; Owner: soundit
--

CREATE TABLE public.opp_applications (
    id text NOT NULL,
    "opportunityId" text NOT NULL,
    "djId" text NOT NULL,
    message text,
    status text DEFAULT 'pending'::text NOT NULL,
    "appliedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "respondedAt" timestamp(3) without time zone
);


ALTER TABLE public.opp_applications OWNER TO soundit;

--
-- Name: opportunities; Type: TABLE; Schema: public; Owner: soundit
--

CREATE TABLE public.opportunities (
    id text NOT NULL,
    "organizerId" text,
    title text NOT NULL,
    description text NOT NULL,
    "eventType" text NOT NULL,
    "eventDate" timestamp(3) without time zone NOT NULL,
    "eventLocation" text NOT NULL,
    budget double precision NOT NULL,
    "budgetCurrency" text DEFAULT 'SLE'::text NOT NULL,
    genres text[],
    "musicStyle" text,
    hours integer,
    "equipmentNeeded" text[],
    requirements text,
    notes text,
    "isFeatured" boolean DEFAULT false NOT NULL,
    "requiredTier" text DEFAULT 'pro'::text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.opportunities OWNER TO soundit;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: soundit
--

CREATE TABLE public.payments (
    id text NOT NULL,
    "bookingId" text NOT NULL,
    "clientId" text NOT NULL,
    "djId" text NOT NULL,
    amount double precision NOT NULL,
    currency text DEFAULT 'SLE'::text NOT NULL,
    type public."PaymentType" DEFAULT 'DEPOSIT'::public."PaymentType" NOT NULL,
    status public."PaymentStatus" DEFAULT 'PENDING'::public."PaymentStatus" NOT NULL,
    provider text,
    "providerRef" text,
    "paidAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.payments OWNER TO soundit;

--
-- Name: pro_subscription_requests; Type: TABLE; Schema: public; Owner: soundit
--

CREATE TABLE public.pro_subscription_requests (
    id text NOT NULL,
    "djId" text NOT NULL,
    plan text DEFAULT 'pro'::text NOT NULL,
    amount double precision DEFAULT 250 NOT NULL,
    currency text DEFAULT 'SLE'::text NOT NULL,
    "paymentMethod" text DEFAULT 'Orange Money'::text NOT NULL,
    "paymentNumber" text DEFAULT '+23272011156'::text NOT NULL,
    "proofUrl" text NOT NULL,
    note text,
    status text DEFAULT 'pending'::text NOT NULL,
    "reviewedById" text,
    "adminNote" text,
    "reviewedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.pro_subscription_requests OWNER TO soundit;

--
-- Name: ranking_history; Type: TABLE; Schema: public; Owner: soundit
--

CREATE TABLE public.ranking_history (
    id text NOT NULL,
    "djId" text NOT NULL,
    "position" integer NOT NULL,
    score double precision NOT NULL,
    "digitalScore" double precision NOT NULL,
    "industryScore" double precision NOT NULL,
    "communityScore" double precision NOT NULL,
    week timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.ranking_history OWNER TO soundit;

--
-- Name: reviews; Type: TABLE; Schema: public; Owner: soundit
--

CREATE TABLE public.reviews (
    id text NOT NULL,
    "userId" text NOT NULL,
    "djId" text NOT NULL,
    rating integer NOT NULL,
    comment text,
    "eventType" text,
    verified boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.reviews OWNER TO soundit;

--
-- Name: streaming_platforms; Type: TABLE; Schema: public; Owner: soundit
--

CREATE TABLE public.streaming_platforms (
    id text NOT NULL,
    "djId" text NOT NULL,
    platform text NOT NULL,
    url text NOT NULL,
    followers integer DEFAULT 0 NOT NULL,
    streams integer DEFAULT 0 NOT NULL,
    uploads integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.streaming_platforms OWNER TO soundit;

--
-- Name: users; Type: TABLE; Schema: public; Owner: soundit
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    password text,
    "googleId" text,
    phone text,
    "phoneVerified" boolean DEFAULT false NOT NULL,
    "phoneOtp" text,
    "phoneOtpExpiry" timestamp(3) without time zone,
    role public."Role" DEFAULT 'USER'::public."Role" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    avatar text,
    bio text,
    "emailVerified" boolean DEFAULT false NOT NULL,
    "favoriteGenres" text[] DEFAULT ARRAY[]::text[],
    "lastLoginAt" timestamp(3) without time zone,
    location text,
    name text,
    "passwordResetExpiry" timestamp(3) without time zone,
    "passwordResetToken" text,
    "socialLinks" jsonb,
    status public."UserStatus" DEFAULT 'ACTIVE'::public."UserStatus" NOT NULL,
    username character varying(30) NOT NULL
);


ALTER TABLE public.users OWNER TO soundit;

--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: soundit
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
2671a697-3e3f-4d38-951e-da7e439e2ee6	be9330eeaf3098a84ae7ffd4ce08174e57f5054a998e3d861a7cca47eb41e852	2026-07-08 22:06:40.139023+08	20260624152316_init	\N	\N	2026-07-08 22:06:40.110813+08	1
efadcd03-519b-4a8a-b836-270ce1d8fc1a	502fc6d17e5cf3414dbaf21c6ee43280e979e75ec2e745537ac134d65deb3c4e	\N	20260626084900_add_user_status_and_audit_logs	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20260626084900_add_user_status_and_audit_logs\n\nDatabase error code: 42703\n\nDatabase error:\nERROR: column "username" does not exist\n\nPosition:\n[1m 40[0m -- AddForeignKey\n[1m 41[0m ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;\n[1m 42[0m\n[1m 43[0m -- Full-text search index for admin user lookup\n[1m 44[0m CREATE EXTENSION IF NOT EXISTS pg_trgm;\n[1m 45[1;31m CREATE INDEX IF NOT EXISTS idx_user_search ON "users" USING gin (lower(email) gin_trgm_ops, lower(username) gin_trgm_ops);[0m\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42703), message: "column \\"username\\" does not exist", detail: None, hint: None, position: Some(Original(1638)), where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("parse_relation.c"), line: Some(3675), routine: Some("errorMissingColumn") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20260626084900_add_user_status_and_audit_logs"\n             at schema-engine/connectors/sql-schema-connector/src/apply_migration.rs:106\n   1: schema_core::commands::apply_migrations::Applying migration\n           with migration_name="20260626084900_add_user_status_and_audit_logs"\n             at schema-engine/core/src/commands/apply_migrations.rs:91\n   2: schema_core::state::ApplyMigrations\n             at schema-engine/core/src/state.rs:226	\N	2026-07-08 22:06:40.1394+08	0
\.


--
-- Data for Name: ad_campaigns; Type: TABLE DATA; Schema: public; Owner: soundit
--

COPY public.ad_campaigns (id, name, "advertiserId", "targetType", "targetId", status, budget, currency, "reachScore", spent, impressions, clicks, ctr, "creativeImageUrl", "ctaUrl", "startDate", "endDate", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: soundit
--

COPY public.audit_logs (id, "actorId", "targetId", action, entity, "entityId", metadata, "ipAddress", "userAgent", "createdAt") FROM stdin;
\.


--
-- Data for Name: battle_entries; Type: TABLE DATA; Schema: public; Owner: soundit
--

COPY public.battle_entries (id, "battleId", "djId", "mixId", "baseScore", "voteScore", "finalScore", votes) FROM stdin;
cmrc8sh8e008kog460urpcg0v	cmrc8sh7u0086og46q50yjl9k	cmrc8sgkn000nog46kb6nldaf	\N	25.6	10	25.36	5
cmrc8sh8n008wog46i2u3xs2u	cmrc8sh7u0086og46q50yjl9k	cmrc8sgmq000wog461b2gfwho	\N	23.7	10	24.22	5
cmrc8sh8v0098og46ra8to2q6	cmrc8sh7u0086og46q50yjl9k	cmrc8sgot0015og46p81zhch5	\N	28.9	10	27.34	5
cmrc8sh830088og46x8pp3sd4	cmrc8sh7u0086og46q50yjl9k	cmrc8sgih000eog469ayeuqzw	\N	30.1	10	28.06	5
\.


--
-- Data for Name: battle_votes; Type: TABLE DATA; Schema: public; Owner: soundit
--

COPY public.battle_votes (id, "entryId", "userId", weight) FROM stdin;
cmrc8sh84008aog46vgi9xaov	cmrc8sh830088og46x8pp3sd4	cmrc8sfu90000og469naa7l6f	1
cmrc8sh86008cog4692q3g5ak	cmrc8sh830088og46x8pp3sd4	cmrc8sfwh0001og46zptnzybl	1
cmrc8sh87008eog46nf1vzpju	cmrc8sh830088og46x8pp3sd4	cmrc8sfyh0002og463wo0b9l7	1
cmrc8sh88008gog4639ouovh8	cmrc8sh830088og46x8pp3sd4	cmrc8sg0g0003og46hwm5pjmc	1
cmrc8sh89008iog46i2t1lk9i	cmrc8sh830088og46x8pp3sd4	cmrc8sg2g0004og46p6se7yxc	1
cmrc8sh8f008mog46o54kdi3j	cmrc8sh8e008kog460urpcg0v	cmrc8sfu90000og469naa7l6f	1
cmrc8sh8g008oog46mxfz7bar	cmrc8sh8e008kog460urpcg0v	cmrc8sfwh0001og46zptnzybl	1
cmrc8sh8h008qog467rfi8emp	cmrc8sh8e008kog460urpcg0v	cmrc8sfyh0002og463wo0b9l7	1
cmrc8sh8i008sog46dtwnfwnu	cmrc8sh8e008kog460urpcg0v	cmrc8sg0g0003og46hwm5pjmc	1
cmrc8sh8i008uog46k8hp19ma	cmrc8sh8e008kog460urpcg0v	cmrc8sg2g0004og46p6se7yxc	1
cmrc8sh8o008yog46bd4agn85	cmrc8sh8n008wog46i2u3xs2u	cmrc8sfu90000og469naa7l6f	1
cmrc8sh8o0090og46ou4zszoh	cmrc8sh8n008wog46i2u3xs2u	cmrc8sfwh0001og46zptnzybl	1
cmrc8sh8p0092og46lrpthfhi	cmrc8sh8n008wog46i2u3xs2u	cmrc8sfyh0002og463wo0b9l7	1
cmrc8sh8q0094og46p91dwnsx	cmrc8sh8n008wog46i2u3xs2u	cmrc8sg0g0003og46hwm5pjmc	1
cmrc8sh8q0096og46foeuhl4t	cmrc8sh8n008wog46i2u3xs2u	cmrc8sg2g0004og46p6se7yxc	1
cmrc8sh8w009aog46rfp7xo88	cmrc8sh8v0098og46ra8to2q6	cmrc8sfu90000og469naa7l6f	1
cmrc8sh8w009cog46fj2tlvpn	cmrc8sh8v0098og46ra8to2q6	cmrc8sfwh0001og46zptnzybl	1
cmrc8sh8x009eog468h6nzdun	cmrc8sh8v0098og46ra8to2q6	cmrc8sfyh0002og463wo0b9l7	1
cmrc8sh8y009gog463k3nyjx3	cmrc8sh8v0098og46ra8to2q6	cmrc8sg0g0003og46hwm5pjmc	1
cmrc8sh8z009iog46b2sk48u9	cmrc8sh8v0098og46ra8to2q6	cmrc8sg2g0004og46p6se7yxc	1
\.


--
-- Data for Name: battles; Type: TABLE DATA; Schema: public; Owner: soundit
--

COPY public.battles (id, title, "weekStart", "weekEnd", status, theme, "metricType", "createdAt") FROM stdin;
cmrc8sh7u0086og46q50yjl9k	Weekly DJ Battle - Amapiano Week	2026-07-08 15:38:12.906	2026-07-15 15:38:12.906	ACTIVE	Amapiano Week	COMPOSITE	2026-07-08 15:38:12.906
\.


--
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: soundit
--

COPY public.bookings (id, "clientId", "djId", "eventType", "eventDate", "eventLocation", duration, budget, "finalPrice", deposit, status, notes, requirements, rating, review, "createdAt", "updatedAt", "budgetMax", "budgetMin", "equipmentNeeded", "eventTypes", "guestEmail", "guestName", "guestPhone", "musicStyles", services, "travelNotes") FROM stdin;
cmrc8sh93009kog463c8hrufb	cmrc8sfu90000og469naa7l6f	cmrc8sgih000eog469ayeuqzw	wedding	2024-12-20 16:00:00	Lumley Beach, Freetown	6	8000	7500	2500	CONFIRMED	Please arrive by 3 PM for setup.	Need wireless microphone for speeches.	\N	\N	2026-07-08 15:38:12.951	2026-07-08 15:38:12.951	\N	\N	{}	{}	\N	\N	\N	{}	\N	\N
\.


--
-- Data for Name: dj_photos; Type: TABLE DATA; Schema: public; Owner: soundit
--

COPY public.dj_photos (id, "djId", url, caption, "sortOrder", "isPublic", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: dj_profiles; Type: TABLE DATA; Schema: public; Owner: soundit
--

COPY public.dj_profiles (id, "userId", "stageName", "fullName", bio, avatar, "coverBanner", country, city, genres, awards, equipment, languages, "bookingFeeMin", "bookingFeeMax", currency, availability, website, "whatsappNumber", verified, "isPublic", "totalFollowers", "totalStreams", "totalMixes", "totalEvents", "totalBookings", "averageRating", "rankingScore", "digitalScore", "industryScore", "communityScore", "rankingPosition", badges, "createdAt", "updatedAt", "apiAccessEnabled", "canReceivePayments", "canViewAnalytics", "depositPercent", "eventTypes", "fullDayRate", "hasAccountManager", "hearThisConnected", "hearThisId", "hourlyRate", "idDocumentType", "idDocumentUrl", "isLegendFeatured", "isPro", "isVerifiedEligible", "legalName", "maxTravelDistanceKm", nationality, services, "socialLinks", "socialProof", "startYear", "streamingLinks", "subscriptionActivatedAt", "subscriptionTier", "totalMixUploads", "verificationNotes", "verificationReason", "verificationStatus", "verifiedAt", "willTravel") FROM stdin;
cmrc8sgkn000nog46kb6nldaf	cmrc8sgkl000log46pgtt2eye	Rampage	Fred Max	The crowd controller. Rampage has been setting dance floors on fire with his unique blend of Salone music and international hits.	https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop	https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&h=400&fit=crop	Sierra Leone	Freetown	{"Salone Mix",Afrobeats,Amapiano}	{"Best Event DJ 2023"}	{"Pioneer DDJ-1000","Serato DJ Pro"}	{English,Krio}	2000	5000	SLE	\N	\N	\N	t	f	4	0	3	1	0	4.5	0	0	0	0	0	{"Verified DJ",Trending}	2026-07-08 15:38:12.071	2026-07-08 15:38:12.868	f	f	f	30	{}	\N	f	f	\N	\N	\N	\N	f	f	f	\N	\N	\N	\N	\N	\N	2017	\N	\N	free	0	\N	\N	unverified	\N	f
cmrc8sgmq000wog461b2gfwho	cmrc8sgmo000uog46yqcy26tr	Cess	Lamin Kamara	Specializing in Ghanaian Azonto and Alkayida dance styles, bringing West African flavor to every set.	https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop	https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=1200&h=400&fit=crop	Sierra Leone	Freetown	{Azonto,Afrobeats,Dancehall,"Hip Life"}	{"Rising Star DJ 2023"}	{"Pioneer XDJ-XZ",Rekordbox}	{English,Krio,Twi}	1500	4000	SLE	\N	\N	\N	t	f	4	0	3	1	0	4	0	0	0	0	0	{"Verified DJ","Fastest Rising"}	2026-07-08 15:38:12.146	2026-07-08 15:38:12.87	f	f	f	30	{}	\N	f	f	\N	\N	\N	\N	f	f	f	\N	\N	\N	\N	\N	\N	2019	\N	\N	free	0	\N	\N	unverified	\N	f
cmrc8sgot0015og46p81zhch5	cmrc8sgor0013og46a4pzanx5	Dito Freaky	Mohamed Conteh	The smooth operator. Known for soulful R&B mixes and romantic wedding sets that create unforgettable moments.	https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop	https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200&h=400&fit=crop	Sierra Leone	Freetown	{R&B,"Salone Mix","Wedding Mixes"}	{"Best Wedding DJ 2023","Most Requested DJ 2022"}	{"Pioneer DJM-V10",CDJ-2000NXS2}	{English,Krio}	2500	6000	SLE	\N	\N	\N	t	f	4	0	3	0	0	5	0	0	0	0	0	{"Verified DJ",Veteran}	2026-07-08 15:38:12.221	2026-07-08 15:38:12.873	f	f	f	30	{}	\N	f	f	\N	\N	\N	\N	f	f	f	\N	\N	\N	\N	\N	\N	2015	\N	\N	free	0	\N	\N	unverified	\N	f
cmrc8sgqv001eog463st8ln5y	cmrc8sgqu001cog46rcob47ny	Busy	Abdul Turay	The party starter. Busy brings high-energy sets that keep the crowd moving all night long.	https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop	https://images.unsplash.com/photo-1598387993441-a364f854c3e1?w=1200&h=400&fit=crop	Sierra Leone	Freetown	{"Club Mixes",Dancehall,"Hip Hop",Afrobeats}	{"Best New DJ 2022"}	{"Pioneer DDJ-FLX10"}	{English,Krio}	1200	3500	SLE	\N	\N	\N	t	f	4	0	3	0	0	4	0	0	0	0	0	{"Verified DJ"}	2026-07-08 15:38:12.296	2026-07-08 15:38:12.875	f	f	f	30	{}	\N	f	f	\N	\N	\N	\N	f	f	f	\N	\N	\N	\N	\N	\N	2020	\N	\N	free	0	\N	\N	unverified	\N	f
cmrc8sgsy001nog46czhyoje2	cmrc8sgsw001log46a0m6yz0a	Kaywize Salone	Ibrahim Bangura	The sound system specialist. Known for the deepest bass and the hardest dancehall selections in Sierra Leone.	https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop	https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1200&h=400&fit=crop	Sierra Leone	Freetown	{Dancehall,Reggae,Dub}	{"Best Sound System 2023","Legendary DJ Award 2021"}	{"Pioneer CDJ-3000",DJM-V10,"Custom Sound System"}	{English,Krio}	4000	10000	SLE	\N	\N	\N	t	f	4	0	3	0	0	5	0	0	0	0	0	{"Verified DJ",Veteran}	2026-07-08 15:38:12.37	2026-07-08 15:38:12.879	f	f	f	30	{}	\N	f	f	\N	\N	\N	\N	f	f	f	\N	\N	\N	\N	\N	\N	2010	\N	\N	free	0	\N	\N	unverified	\N	f
cmrc8sgv0001wog46p43znrks	cmrc8sguz001uog46pts467sk	DJ Maggie	DJ Maggie	The leading female DJ in Sierra Leone, breaking barriers with versatile sets spanning multiple genres.	https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop	https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&h=400&fit=crop	Sierra Leone	Bo	{Afrobeats,Amapiano,R&B,"Salone Mix"}	{"Best Female DJ 2023","DJ of the Year Bo 2022"}	{"Pioneer DDJ-1000","Serato DJ Pro"}	{English,Krio}	2000	4500	SLE	\N	\N	\N	t	f	4	0	3	0	0	5	0	0	0	0	0	{"Verified DJ",Trending}	2026-07-08 15:38:12.445	2026-07-08 15:38:12.882	f	f	f	30	{}	\N	f	f	\N	\N	\N	\N	f	f	f	\N	\N	\N	\N	\N	\N	2018	\N	\N	free	0	\N	\N	unverified	\N	f
cmrc8sgxd0025og4614k7xmmf	cmrc8sgxb0023og46jv4kcumy	Switch	Kelvin Doe	The Eastern Province champion. Switch reps Kenema with pride and brings the best mix of local and international hits.	https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=400&h=400&fit=crop	https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?w=1200&h=400&fit=crop	Sierra Leone	Kenema	{"Salone Mix",Afrobeats,Dancehall}	{"Best DJ Kenema 2023"}	{"Pioneer XDJ-RX3"}	{English,Krio,Mende}	1000	3000	SLE	\N	\N	\N	t	f	4	0	3	0	0	4	0	0	0	0	0	{"Verified DJ"}	2026-07-08 15:38:12.529	2026-07-08 15:38:12.884	f	f	f	30	{}	\N	f	f	\N	\N	\N	\N	f	f	f	\N	\N	\N	\N	\N	\N	4	\N	\N	free	0	\N	\N	unverified	\N	f
cmrc8sgzh002eog46wl5ta564	cmrc8sgzf002cog46tktvf4ak	Bow	Alie Hassan Nasralla	The Northern star. Bow has been keeping Makeni dancing with his signature blend of traditional and modern sounds.	https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop	https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&h=400&fit=crop	Sierra Leone	Makeni	{"Salone Mix",Gospel,Afrobeats}	{"Best DJ North 2022"}	{"Pioneer DDJ-800"}	{English,Krio,Temne}	1500	3500	SLE	\N	\N	\N	t	f	4	0	3	0	0	0	0	0	0	0	0	{"Verified DJ",Veteran}	2026-07-08 15:38:12.605	2026-07-08 15:38:12.887	f	f	f	30	{}	\N	f	f	\N	\N	\N	\N	f	f	f	\N	\N	\N	\N	\N	\N	2016	\N	\N	free	0	\N	\N	unverified	\N	f
cmrc8sgih000eog469ayeuqzw	cmrc8sgig000cog46kki1t1ix	Fred Max	Abdul Conteh	One of Sierra Leone's most celebrated DJs, known for electrifying club sets and seamless transitions between Afrobeats and Dancehall.	https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400&h=400&fit=crop	https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?w=1200&h=400&fit=crop	Sierra Leone	Freetown	{Afrobeats,Dancehall,"Hip Hop"}	{"Best Club DJ 2023","DJ of the Year 2022"}	{"Pioneer CDJ-3000",DJM-900NXS2,"RANE Twelve"}	{English,Krio}	3000	8000	SLE	\N	\N	\N	t	f	4	0	3	1	0	5	0	0	0	0	0	{"Verified DJ","Top Ranked",Veteran}	2026-07-08 15:38:11.994	2026-07-08 15:38:12.864	f	f	f	30	{}	\N	f	f	\N	\N	\N	\N	f	f	f	\N	\N	\N	\N	\N	\N	2013	\N	\N	free	0	\N	\N	unverified	\N	f
cmrc8sh1j002nog46k3mmr9a1	cmrc8sh1i002log46vfn84ruy	Min-1	Mamaja Jalloh	The Amapiano ambassador of Sierra Leone. Min-1 introduced the South African sound to the Southern Province.	https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&fit=crop	https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=1200&h=400&fit=crop	Sierra Leone	Bo	{Amapiano,Afrobeats,"Deep House"}	{"Best Amapiano DJ 2023"}	{"Pioneer DDJ-FLX6"}	{English,Krio}	800	2500	SLE	\N	\N	\N	t	f	4	0	3	0	0	0	0	0	0	0	0	{"Verified DJ","Fastest Rising"}	2026-07-08 15:38:12.679	2026-07-08 15:38:12.889	f	f	f	30	{}	\N	f	f	\N	\N	\N	\N	f	f	f	\N	\N	\N	\N	\N	\N	2022	\N	\N	free	0	\N	\N	unverified	\N	f
cmrc8sh3m002wog46me7yhlsg	cmrc8sh3l002uog46gvz1wpph	Flex	Wilmot Faulkner	The versatile maestro. From corporate events to beach parties, Flex adapts to any crowd and any vibe.	https://images.unsplash.com/photo-1599566150163-29194dcabd9c?w=400&h=400&fit=crop	https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&h=400&fit=crop	Sierra Leone	Freetown	{"Club Mixes",Afrobeats,"Hip Hop",Throwbacks}	{"Most Versatile DJ 2023"}	{"Pioneer CDJ-2000NXS2",DJM-900NXS2}	{English,Krio}	1800	4500	SLE	\N	\N	\N	t	f	4	0	2	0	0	0	0	0	0	0	0	{"Verified DJ"}	2026-07-08 15:38:12.754	2026-07-08 15:38:12.891	f	f	f	30	{}	\N	f	f	\N	\N	\N	\N	f	f	f	\N	\N	\N	\N	\N	\N	2018	\N	\N	free	0	\N	\N	unverified	\N	f
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: soundit
--

COPY public.events (id, "djId", title, description, type, date, location, city, venue, image, "isOpenSlot", slots, "filledSlots", compensation, requirements, status, "soundItSaloneEventId", "soundItSaloneUrl", "isSyncedToSalone", "createdAt", "updatedAt", "ticketUrl") FROM stdin;
cmrc8sh46004vog461ht1wpt8	\N	Freetown Music Festival 2024	The biggest music festival in Sierra Leone featuring top DJs and live performances.	festival	2024-12-15 18:00:00	Lumley Beach, Freetown	Freetown	Lumley Beach	\N	f	8	0	\N	\N	upcoming	\N	\N	f	2026-07-08 15:38:12.775	2026-07-08 15:38:12.775	\N
cmrc8sh47004wog460g581g87	\N	Club Night at The Warehouse	Weekly club night featuring resident DJs and special guests.	club-night	2024-11-30 21:00:00	The Warehouse, Freetown	Freetown	The Warehouse	\N	f	3	0	\N	\N	upcoming	\N	\N	f	2026-07-08 15:38:12.776	2026-07-08 15:38:12.776	\N
cmrc8sh48004xog46vsxuftvn	\N	Bo City Carnival	Annual carnival celebrating Southern Province culture with music and dance.	festival	2024-12-20 14:00:00	Bo Stadium, Bo	Bo	Bo Stadium	\N	f	6	0	\N	\N	upcoming	\N	\N	f	2026-07-08 15:38:12.776	2026-07-08 15:38:12.776	\N
cmrc8sh48004yog46gl3aezkb	\N	Wedding Expo 2024	Connect with wedding DJs and plan your perfect celebration.	corporate	2024-11-25 10:00:00	Bintumani Hotel, Freetown	Freetown	Bintumani Hotel	\N	t	4	0	5000	\N	upcoming	\N	\N	f	2026-07-08 15:38:12.777	2026-07-08 15:38:12.777	\N
cmrc8sh49004zog46q9cm910q	\N	Kenema All-Night Party	The biggest party in the Eastern Province. All-night dancing with the best DJs.	private-party	2024-12-05 20:00:00	Palm Beach Hotel, Kenema	Kenema	Palm Beach Hotel	\N	f	4	0	\N	\N	upcoming	\N	\N	f	2026-07-08 15:38:12.778	2026-07-08 15:38:12.778	\N
cmrc8sh4a0051og46txxcyp74	cmrc8sgih000eog469ayeuqzw	Fred Max Live Set	Exclusive live performance by Fred Max	club-night	2026-07-15 15:38:12.777	Freetown City Center	Freetown	Fred Max Venue	\N	f	0	0	\N	\N	upcoming	\N	\N	f	2026-07-08 15:38:12.778	2026-07-08 15:38:12.778	\N
cmrc8sh4a0053og46hnn4pa8u	cmrc8sgkn000nog46kb6nldaf	Rampage Live Set	Exclusive live performance by Rampage	club-night	2026-07-22 15:38:12.778	Freetown City Center	Freetown	Rampage Venue	\N	f	0	0	\N	\N	upcoming	\N	\N	f	2026-07-08 15:38:12.779	2026-07-08 15:38:12.779	\N
cmrc8sh4b0055og46ooqh68eu	cmrc8sgmq000wog461b2gfwho	Cess Live Set	Exclusive live performance by Cess	club-night	2026-07-29 15:38:12.779	Freetown City Center	Freetown	Cess Venue	\N	f	0	0	\N	\N	upcoming	\N	\N	f	2026-07-08 15:38:12.779	2026-07-08 15:38:12.779	\N
\.


--
-- Data for Name: follows; Type: TABLE DATA; Schema: public; Owner: soundit
--

COPY public.follows (id, "userId", "djId", "createdAt") FROM stdin;
cmrc8sh4h005rog46kmr8bt8d	cmrc8sfu90000og469naa7l6f	cmrc8sgih000eog469ayeuqzw	2026-07-08 15:38:12.785
cmrc8sh4h005tog46w34xdylh	cmrc8sfu90000og469naa7l6f	cmrc8sgot0015og46p81zhch5	2026-07-08 15:38:12.786
cmrc8sh4i005vog46ev9h2f9c	cmrc8sfu90000og469naa7l6f	cmrc8sgv0001wog46p43znrks	2026-07-08 15:38:12.786
cmrc8sh4i005xog46bt8pe6co	cmrc8sfu90000og469naa7l6f	cmrc8sh1j002nog46k3mmr9a1	2026-07-08 15:38:12.786
cmrc8sh4i005zog467v1uiaw5	cmrc8sfwh0001og46zptnzybl	cmrc8sgmq000wog461b2gfwho	2026-07-08 15:38:12.787
cmrc8sh4j0061og46xug39jr9	cmrc8sfwh0001og46zptnzybl	cmrc8sgsy001nog46czhyoje2	2026-07-08 15:38:12.787
cmrc8sh4j0063og46e94dlosg	cmrc8sfwh0001og46zptnzybl	cmrc8sgzh002eog46wl5ta564	2026-07-08 15:38:12.788
cmrc8sh4k0065og46c9obufp1	cmrc8sfyh0002og463wo0b9l7	cmrc8sgkn000nog46kb6nldaf	2026-07-08 15:38:12.788
cmrc8sh4l0067og46fjvdt9jv	cmrc8sfyh0002og463wo0b9l7	cmrc8sgqv001eog463st8ln5y	2026-07-08 15:38:12.789
cmrc8sh4l0069og46b872cxbp	cmrc8sfyh0002og463wo0b9l7	cmrc8sgxd0025og4614k7xmmf	2026-07-08 15:38:12.789
cmrc8sh4l006bog46b5vrfg01	cmrc8sfyh0002og463wo0b9l7	cmrc8sh3m002wog46me7yhlsg	2026-07-08 15:38:12.79
cmrc8sh4l006dog46b7xn8x4b	cmrc8sg0g0003og46hwm5pjmc	cmrc8sgih000eog469ayeuqzw	2026-07-08 15:38:12.79
cmrc8sh4m006fog46d1c9vyip	cmrc8sg0g0003og46hwm5pjmc	cmrc8sgot0015og46p81zhch5	2026-07-08 15:38:12.79
cmrc8sh4m006hog462ubagcs8	cmrc8sg0g0003og46hwm5pjmc	cmrc8sgv0001wog46p43znrks	2026-07-08 15:38:12.791
cmrc8sh4m006jog46x8fjyecm	cmrc8sg0g0003og46hwm5pjmc	cmrc8sh1j002nog46k3mmr9a1	2026-07-08 15:38:12.791
cmrc8sh4n006log46ux33fodm	cmrc8sg2g0004og46p6se7yxc	cmrc8sgmq000wog461b2gfwho	2026-07-08 15:38:12.791
cmrc8sh4n006nog46lebibl1v	cmrc8sg2g0004og46p6se7yxc	cmrc8sgsy001nog46czhyoje2	2026-07-08 15:38:12.791
cmrc8sh4n006pog46cei832v4	cmrc8sg2g0004og46p6se7yxc	cmrc8sgzh002eog46wl5ta564	2026-07-08 15:38:12.792
cmrc8sh4o006rog46f3pdr35j	cmrc8sg4g0005og46t26e1ltg	cmrc8sgkn000nog46kb6nldaf	2026-07-08 15:38:12.792
cmrc8sh4o006tog4673799xfe	cmrc8sg4g0005og46t26e1ltg	cmrc8sgqv001eog463st8ln5y	2026-07-08 15:38:12.792
cmrc8sh4o006vog46pxxguff0	cmrc8sg4g0005og46t26e1ltg	cmrc8sgxd0025og4614k7xmmf	2026-07-08 15:38:12.793
cmrc8sh4o006xog466c047nfo	cmrc8sg4g0005og46t26e1ltg	cmrc8sh3m002wog46me7yhlsg	2026-07-08 15:38:12.793
cmrc8sh4p006zog46unsvbm8d	cmrc8sg6f0006og46t2490pfc	cmrc8sgih000eog469ayeuqzw	2026-07-08 15:38:12.793
cmrc8sh4p0071og46h5ymai3p	cmrc8sg6f0006og46t2490pfc	cmrc8sgot0015og46p81zhch5	2026-07-08 15:38:12.794
cmrc8sh4q0073og46lz6w2q8b	cmrc8sg6f0006og46t2490pfc	cmrc8sgv0001wog46p43znrks	2026-07-08 15:38:12.794
cmrc8sh4q0075og46tjqw93em	cmrc8sg6f0006og46t2490pfc	cmrc8sh1j002nog46k3mmr9a1	2026-07-08 15:38:12.795
cmrc8sh4r0077og46e0kf0szz	cmrc8sg8f0007og46djtw7fmi	cmrc8sgmq000wog461b2gfwho	2026-07-08 15:38:12.795
cmrc8sh4s0079og4660n6d5zf	cmrc8sg8f0007og46djtw7fmi	cmrc8sgsy001nog46czhyoje2	2026-07-08 15:38:12.796
cmrc8sh4s007bog46lo28d6c9	cmrc8sg8f0007og46djtw7fmi	cmrc8sgzh002eog46wl5ta564	2026-07-08 15:38:12.797
cmrc8sh4t007dog46nbb7b4y7	cmrc8sgaf0008og46lcpnygt0	cmrc8sgkn000nog46kb6nldaf	2026-07-08 15:38:12.797
cmrc8sh4t007fog46pmiztozx	cmrc8sgaf0008og46lcpnygt0	cmrc8sgqv001eog463st8ln5y	2026-07-08 15:38:12.798
cmrc8sh4u007hog465c0j2uc8	cmrc8sgaf0008og46lcpnygt0	cmrc8sgxd0025og4614k7xmmf	2026-07-08 15:38:12.798
cmrc8sh4u007jog469y7b59n0	cmrc8sgaf0008og46lcpnygt0	cmrc8sh3m002wog46me7yhlsg	2026-07-08 15:38:12.798
cmrc8sh4u007log46buhgizp0	cmrc8sgce0009og46evvhn8pf	cmrc8sgih000eog469ayeuqzw	2026-07-08 15:38:12.799
cmrc8sh4v007nog46bg3qbvrs	cmrc8sgce0009og46evvhn8pf	cmrc8sgot0015og46p81zhch5	2026-07-08 15:38:12.799
cmrc8sh4v007pog462rrvktdp	cmrc8sgce0009og46evvhn8pf	cmrc8sgv0001wog46p43znrks	2026-07-08 15:38:12.8
cmrc8sh4w007rog46st5s4q3v	cmrc8sgce0009og46evvhn8pf	cmrc8sh1j002nog46k3mmr9a1	2026-07-08 15:38:12.8
cmrc8sh4w007tog46hqg77d0v	cmrc8sged000aog46lzepry1f	cmrc8sgmq000wog461b2gfwho	2026-07-08 15:38:12.801
cmrc8sh4w007vog4664l7txfx	cmrc8sged000aog46lzepry1f	cmrc8sgsy001nog46czhyoje2	2026-07-08 15:38:12.801
cmrc8sh4x007xog46blc7hk7t	cmrc8sged000aog46lzepry1f	cmrc8sgzh002eog46wl5ta564	2026-07-08 15:38:12.801
cmrc8sh4x007zog460zf58108	cmrc8sggc000bog4687d8mx5r	cmrc8sgkn000nog46kb6nldaf	2026-07-08 15:38:12.802
cmrc8sh4x0081og468zsvhbvx	cmrc8sggc000bog4687d8mx5r	cmrc8sgqv001eog463st8ln5y	2026-07-08 15:38:12.802
cmrc8sh4y0083og46dmz66jps	cmrc8sggc000bog4687d8mx5r	cmrc8sgxd0025og4614k7xmmf	2026-07-08 15:38:12.802
cmrc8sh4y0085og46tw7bwo0q	cmrc8sggc000bog4687d8mx5r	cmrc8sh3m002wog46me7yhlsg	2026-07-08 15:38:12.802
\.


--
-- Data for Name: gig_applications; Type: TABLE DATA; Schema: public; Owner: soundit
--

COPY public.gig_applications (id, "gigId", "djId", "proposedPrice", message, status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: gigs; Type: TABLE DATA; Schema: public; Owner: soundit
--

COPY public.gigs (id, "clientName", "clientEmail", "clientPhone", "clientToken", "eventType", "eventDate", "startTime", "durationHours", location, city, "budgetMin", "budgetMax", "musicStyles", "equipmentNeeded", notes, status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: soundit
--

COPY public.messages (id, "senderId", "receiverId", content, "bookingId", "readAt", "createdAt", "updatedAt", "deletedBySender", "deletedByReceiver") FROM stdin;
\.


--
-- Data for Name: mix_likes; Type: TABLE DATA; Schema: public; Owner: soundit
--

COPY public.mix_likes (id, "mixId", "userId", "createdAt") FROM stdin;
\.


--
-- Data for Name: mixes; Type: TABLE DATA; Schema: public; Owner: soundit
--

COPY public.mixes (id, "djId", title, description, "coverImage", "audioUrl", duration, genre, tags, category, plays, likes, downloads, "isPublic", featured, "createdAt", "updatedAt", "audioSource", "originalUrl") FROM stdin;
cmrc8sh3o0034og46urdizii5	cmrc8sgih000eog469ayeuqzw	Salone Vibes Vol. 1	\N	https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop	https://example.com/audio.mp3	6791	Salone Mix	{"sierra leone",bubu,gumbe}	Salone Mix	0	0	0	t	f	2026-07-08 15:38:12.756	2026-07-08 15:38:12.756	\N	\N
cmrc8sh3p0036og46vampmdxx	cmrc8sgkn000nog46kb6nldaf	Afrobeats Heatwave 2024	\N	https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop	https://example.com/audio.mp3	3632	Afrobeats	{naija,"burna boy",wizkid}	Afrobeats	0	0	0	t	f	2026-07-08 15:38:12.758	2026-07-08 15:38:12.758	\N	\N
cmrc8sh3q0038og46yuesbopy	cmrc8sgmq000wog461b2gfwho	Dancehall Kings Mix	\N	https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop	https://example.com/audio.mp3	5910	Dancehall	{jamaica,"vybz kartel",alkaline}	Dancehall	0	0	0	t	f	2026-07-08 15:38:12.758	2026-07-08 15:38:12.758	\N	\N
cmrc8sh3q003aog469a19yw84	cmrc8sgot0015og46p81zhch5	Club Night Anthems	\N	https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop	https://example.com/audio.mp3	4668	Club Mixes	{party,club,anthems}	Club Mixes	0	0	0	t	f	2026-07-08 15:38:12.759	2026-07-08 15:38:12.759	\N	\N
cmrc8sh3r003cog46ccg6nr5x	cmrc8sgqv001eog463st8ln5y	Amapiano to the World	\N	https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop	https://example.com/audio.mp3	4094	Amapiano	{"south africa","kabza de small","dj maphorsa"}	Amapiano	0	0	0	t	f	2026-07-08 15:38:12.759	2026-07-08 15:38:12.759	\N	\N
cmrc8sh3r003eog46bsjou574	cmrc8sgsy001nog46czhyoje2	Salone Fiesta Mix	\N	https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop	https://example.com/audio.mp3	5737	Salone Mix	{freetown,"sierra leone",party}	Salone Mix	0	0	0	t	f	2026-07-08 15:38:12.76	2026-07-08 15:38:12.76	\N	\N
cmrc8sh3s003gog46eh7ppl6u	cmrc8sgv0001wog46p43znrks	Afrobeats Non-Stop	\N	https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop	https://example.com/audio.mp3	5074	Afrobeats	{davido,"tiwa savage",afro}	Afrobeats	0	0	0	t	f	2026-07-08 15:38:12.761	2026-07-08 15:38:12.761	\N	\N
cmrc8sh3t003iog46orjlk7oo	cmrc8sgxd0025og4614k7xmmf	Weekend Turn Up	\N	https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop	https://example.com/audio.mp3	5476	Club Mixes	{weekend,party,"turn up"}	Club Mixes	0	0	0	t	f	2026-07-08 15:38:12.761	2026-07-08 15:38:12.761	\N	\N
cmrc8sh3t003kog46lwnlpp94	cmrc8sgzh002eog46wl5ta564	Azonto Revival	\N	https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop	https://example.com/audio.mp3	4799	Afrobeats	{ghana,azonto,"fuse odg"}	Afrobeats	0	0	0	t	f	2026-07-08 15:38:12.762	2026-07-08 15:38:12.762	\N	\N
cmrc8sh3u003mog46peqaczpm	cmrc8sh1j002nog46k3mmr9a1	Alkayida Dance Special	\N	https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop	https://example.com/audio.mp3	4857	Afrobeats	{alkayida,dance,ghana}	Afrobeats	0	0	0	t	f	2026-07-08 15:38:12.762	2026-07-08 15:38:12.762	\N	\N
cmrc8sh3v003oog46mthe03ig	cmrc8sh3m002wog46me7yhlsg	West African Connection	\N	https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop	https://example.com/audio.mp3	4144	Afrobeats	{"west africa",fusion,vibes}	Afrobeats	0	0	0	t	f	2026-07-08 15:38:12.763	2026-07-08 15:38:12.763	\N	\N
cmrc8sh3v003qog46eqwim7i3	cmrc8sgih000eog469ayeuqzw	Slow Jams & R&B Classics	\N	https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop	https://example.com/audio.mp3	4900	R&B	{r&b,"slow jams",love}	Throwbacks	0	0	0	t	f	2026-07-08 15:38:12.764	2026-07-08 15:38:12.764	\N	\N
cmrc8sh3w003sog46cuwfs0zx	cmrc8sgkn000nog46kb6nldaf	Wedding Bliss Mix	\N	https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop	https://example.com/audio.mp3	6667	Wedding Mixes	{wedding,love,"first dance"}	Wedding Mixes	0	0	0	t	f	2026-07-08 15:38:12.764	2026-07-08 15:38:12.764	\N	\N
cmrc8sh3w003uog4657wk7zy7	cmrc8sgmq000wog461b2gfwho	Salone Love Songs	\N	https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop	https://example.com/audio.mp3	6244	Salone Mix	{"sierra leone",love,emerson}	Salone Mix	0	0	0	t	f	2026-07-08 15:38:12.765	2026-07-08 15:38:12.765	\N	\N
cmrc8sh3x003wog46ku67jxn9	cmrc8sgot0015og46p81zhch5	Party Hard Mix Vol. 1	\N	https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop	https://example.com/audio.mp3	5712	Club Mixes	{party,club,bangers}	Club Mixes	0	0	0	t	f	2026-07-08 15:38:12.765	2026-07-08 15:38:12.765	\N	\N
cmrc8sh3x003yog46lhn0ot3f	cmrc8sgqv001eog463st8ln5y	Hip Hop Takeover	\N	https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop	https://example.com/audio.mp3	4210	Hip Hop	{"hip hop",rap,drake}	Club Mixes	0	0	0	t	f	2026-07-08 15:38:12.766	2026-07-08 15:38:12.766	\N	\N
cmrc8sh3y0040og4672rhtgtn	cmrc8sgsy001nog46czhyoje2	Dancehall Don	\N	https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop	https://example.com/audio.mp3	5773	Dancehall	{dancehall,reggae,bashment}	Dancehall	0	0	0	t	f	2026-07-08 15:38:12.766	2026-07-08 15:38:12.766	\N	\N
cmrc8sh3y0042og46hm58ogj4	cmrc8sgv0001wog46p43znrks	Reggae Roots Revival	\N	https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop	https://example.com/audio.mp3	6977	Reggae	{reggae,"bob marley",roots}	Dancehall	0	0	0	t	f	2026-07-08 15:38:12.767	2026-07-08 15:38:12.767	\N	\N
cmrc8sh3z0044og46qqp6vyq3	cmrc8sgxd0025og4614k7xmmf	Sound System Culture	\N	https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop	https://example.com/audio.mp3	4490	Dancehall	{"sound system",dub,culture}	Dancehall	0	0	0	t	f	2026-07-08 15:38:12.767	2026-07-08 15:38:12.767	\N	\N
cmrc8sh3z0046og462gtwfert	cmrc8sgzh002eog46wl5ta564	Caribbean Connection	\N	https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop	https://example.com/audio.mp3	4191	Dancehall	{caribbean,"island vibes",socca}	Dancehall	0	0	0	t	f	2026-07-08 15:38:12.768	2026-07-08 15:38:12.768	\N	\N
cmrc8sh400048og46ngl6rpo2	cmrc8sh1j002nog46k3mmr9a1	Queen of the Decks	\N	https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop	https://example.com/audio.mp3	4697	Club Mixes	{"female dj",power,queen}	Club Mixes	0	0	0	t	f	2026-07-08 15:38:12.768	2026-07-08 15:38:12.768	\N	\N
cmrc8sh40004aog46i68lxl7y	cmrc8sh3m002wog46me7yhlsg	Amapiano Queens	\N	https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop	https://example.com/audio.mp3	5485	Amapiano	{amapiano,female,vibes}	Amapiano	0	0	0	t	f	2026-07-08 15:38:12.769	2026-07-08 15:38:12.769	\N	\N
cmrc8sh41004cog46y5yc8s3a	cmrc8sgih000eog469ayeuqzw	Ladies Night Special	\N	https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop	https://example.com/audio.mp3	4801	R&B	{ladies,r&b,beyonce}	Club Mixes	0	0	0	t	f	2026-07-08 15:38:12.769	2026-07-08 15:38:12.769	\N	\N
cmrc8sh41004eog46dnucvc75	cmrc8sgkn000nog46kb6nldaf	Eastern Province Vibes	\N	https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop	https://example.com/audio.mp3	5416	Salone Mix	{kenema,"eastern province",local}	Salone Mix	0	0	0	t	f	2026-07-08 15:38:12.77	2026-07-08 15:38:12.77	\N	\N
cmrc8sh42004gog46vy4b13st	cmrc8sgmq000wog461b2gfwho	Mende Traditional Fusion	\N	https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop	https://example.com/audio.mp3	6194	Salone Mix	{mende,traditional,fusion}	Salone Mix	0	0	0	t	f	2026-07-08 15:38:12.77	2026-07-08 15:38:12.77	\N	\N
cmrc8sh42004iog4620eviufm	cmrc8sgot0015og46p81zhch5	Northern Lights Mix	\N	https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop	https://example.com/audio.mp3	3707	Salone Mix	{makeni,northern,temne}	Salone Mix	0	0	0	t	f	2026-07-08 15:38:12.771	2026-07-08 15:38:12.771	\N	\N
cmrc8sh43004kog460tru9apf	cmrc8sgqv001eog463st8ln5y	Gospel Praise Mix	\N	https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop	https://example.com/audio.mp3	4001	Gospel	{gospel,praise,worship}	Gospel	0	0	0	t	f	2026-07-08 15:38:12.771	2026-07-08 15:38:12.771	\N	\N
cmrc8sh43004mog46uig465ua	cmrc8sgsy001nog46czhyoje2	Sunday Morning Bliss	\N	https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop	https://example.com/audio.mp3	5016	Gospel	{sunday,gospel,peace}	Gospel	0	0	0	t	f	2026-07-08 15:38:12.771	2026-07-08 15:38:12.771	\N	\N
cmrc8sh43004oog46ksfk2tgh	cmrc8sgv0001wog46p43znrks	Amapiano Deep Cuts	\N	https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop	https://example.com/audio.mp3	7148	Amapiano	{amapiano,deep,soulful}	Amapiano	0	0	0	t	f	2026-07-08 15:38:12.772	2026-07-08 15:38:12.772	\N	\N
cmrc8sh44004qog467wm1d5uc	cmrc8sgxd0025og4614k7xmmf	Yanos to the World	\N	https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop	https://example.com/audio.mp3	6694	Amapiano	{yano,"south africa",global}	Amapiano	0	0	0	t	f	2026-07-08 15:38:12.772	2026-07-08 15:38:12.772	\N	\N
cmrc8sh44004sog46uiibavfv	cmrc8sgzh002eog46wl5ta564	Throwback Thursday	\N	https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop	https://example.com/audio.mp3	5461	Throwbacks	{throwback,"old school",classics}	Throwbacks	0	0	0	t	f	2026-07-08 15:38:12.773	2026-07-08 15:38:12.773	\N	\N
cmrc8sh45004uog46vn2jmtl2	cmrc8sh1j002nog46k3mmr9a1	Corporate Event Set	\N	https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop	https://example.com/audio.mp3	6502	Wedding Mixes	{corporate,professional,smooth}	Wedding Mixes	0	0	0	t	f	2026-07-08 15:38:12.773	2026-07-08 15:38:12.773	\N	\N
\.


--
-- Data for Name: opp_applications; Type: TABLE DATA; Schema: public; Owner: soundit
--

COPY public.opp_applications (id, "opportunityId", "djId", message, status, "appliedAt", "respondedAt") FROM stdin;
\.


--
-- Data for Name: opportunities; Type: TABLE DATA; Schema: public; Owner: soundit
--

COPY public.opportunities (id, "organizerId", title, description, "eventType", "eventDate", "eventLocation", budget, "budgetCurrency", genres, "musicStyle", hours, "equipmentNeeded", requirements, notes, "isFeatured", "requiredTier", status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: soundit
--

COPY public.payments (id, "bookingId", "clientId", "djId", amount, currency, type, status, provider, "providerRef", "paidAt", "createdAt", "updatedAt") FROM stdin;
cmrc8sh94009mog465wcmh7j1	cmrc8sh93009kog463c8hrufb	cmrc8sfu90000og469naa7l6f	cmrc8sgih000eog469ayeuqzw	2500	SLE	DEPOSIT	COMPLETED	manual	DEPOSIT_001	2026-07-08 15:38:12.952	2026-07-08 15:38:12.953	2026-07-08 15:38:12.953
cmrc8sh96009oog46l9b3c9dn	cmrc8sh93009kog463c8hrufb	cmrc8sfu90000og469naa7l6f	cmrc8sgih000eog469ayeuqzw	5000	SLE	FULL_PAYMENT	PENDING	manual	\N	\N	2026-07-08 15:38:12.954	2026-07-08 15:38:12.954
\.


--
-- Data for Name: pro_subscription_requests; Type: TABLE DATA; Schema: public; Owner: soundit
--

COPY public.pro_subscription_requests (id, "djId", plan, amount, currency, "paymentMethod", "paymentNumber", "proofUrl", note, status, "reviewedById", "adminNote", "reviewedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ranking_history; Type: TABLE DATA; Schema: public; Owner: soundit
--

COPY public.ranking_history (id, "djId", "position", score, "digitalScore", "industryScore", "communityScore", week) FROM stdin;
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: soundit
--

COPY public.reviews (id, "userId", "djId", rating, comment, "eventType", verified, "createdAt") FROM stdin;
cmrc8sh4b0057og46o3yuan5p	cmrc8sfu90000og469naa7l6f	cmrc8sgih000eog469ayeuqzw	5	Absolutely amazing set at our wedding! Fred Max kept everyone on the dance floor all night.	wedding	t	2026-07-08 15:38:12.78
cmrc8sh4c0059og46i9klp5wf	cmrc8sfwh0001og46zptnzybl	cmrc8sgih000eog469ayeuqzw	5	The best DJ in Freetown, hands down. Professional and incredibly talented.	club-night	t	2026-07-08 15:38:12.781
cmrc8sh4d005bog46de2pfe9t	cmrc8sfyh0002og463wo0b9l7	cmrc8sgkn000nog46kb6nldaf	4	Rampage brought amazing energy to our event. The crowd loved every minute.	private-party	t	2026-07-08 15:38:12.781
cmrc8sh4d005dog46x4hud2p5	cmrc8sg0g0003og46hwm5pjmc	cmrc8sgkn000nog46kb6nldaf	5	Incredible mixing skills. Seamless transitions and great song selection.	club-night	t	2026-07-08 15:38:12.781
cmrc8sh4e005fog46gxccjb93	cmrc8sg2g0004og46p6se7yxc	cmrc8sgmq000wog461b2gfwho	4	Love the Alkayida mixes! Always gets the crowd moving.	festival	t	2026-07-08 15:38:12.782
cmrc8sh4e005hog46mj8t8rj7	cmrc8sg4g0005og46t26e1ltg	cmrc8sgot0015og46p81zhch5	5	Dito Freaky made our wedding day absolutely perfect. Beautiful music selection.	wedding	t	2026-07-08 15:38:12.783
cmrc8sh4f005jog46rylai449	cmrc8sg6f0006og46t2490pfc	cmrc8sgqv001eog463st8ln5y	4	High energy and great crowd interaction. Would book again!	club-night	t	2026-07-08 15:38:12.783
cmrc8sh4f005log468ygxr058	cmrc8sg8f0007og46djtw7fmi	cmrc8sgsy001nog46czhyoje2	5	Kaywize Salone is a legend. The sound system alone is worth the booking.	festival	t	2026-07-08 15:38:12.784
cmrc8sh4g005nog4646pmu1y8	cmrc8sgaf0008og46lcpnygt0	cmrc8sgv0001wog46p43znrks	5	DJ Maggie is an inspiration for female DJs. Amazing talent!	club-night	t	2026-07-08 15:38:12.784
cmrc8sh4g005pog46bw8z3ccy	cmrc8sgce0009og46evvhn8pf	cmrc8sgxd0025og4614k7xmmf	4	Great selection of local and international hits. Kenema represent!	private-party	t	2026-07-08 15:38:12.785
\.


--
-- Data for Name: streaming_platforms; Type: TABLE DATA; Schema: public; Owner: soundit
--

COPY public.streaming_platforms (id, "djId", platform, url, followers, streams, uploads) FROM stdin;
cmrc8sgil000gog46zolrobsb	cmrc8sgih000eog469ayeuqzw	YouTube	https://youtube.com/fredmax	0	0	0
cmrc8sgim000iog46c6y685ak	cmrc8sgih000eog469ayeuqzw	Audiomack	https://audiomack.com/fredmax	0	0	0
cmrc8sgin000kog46h1myp6sa	cmrc8sgih000eog469ayeuqzw	Mixcloud	https://mixcloud.com/fredmax	0	0	0
cmrc8sgko000pog46qbwq5ihp	cmrc8sgkn000nog46kb6nldaf	YouTube	https://youtube.com/rampage	0	0	0
cmrc8sgkp000rog46h58xec1l	cmrc8sgkn000nog46kb6nldaf	Audiomack	https://audiomack.com/rampage	0	0	0
cmrc8sgkp000tog46qsp9cnbh	cmrc8sgkn000nog46kb6nldaf	SoundCloud	https://soundcloud.com/rampage	0	0	0
cmrc8sgmr000yog46h6nzdn5i	cmrc8sgmq000wog461b2gfwho	YouTube	https://youtube.com/cess	0	0	0
cmrc8sgms0010og46mm9s3276	cmrc8sgmq000wog461b2gfwho	Audiomack	https://audiomack.com/cess	0	0	0
cmrc8sgms0012og46vg9ihvze	cmrc8sgmq000wog461b2gfwho	Mixcloud	https://mixcloud.com/cess	0	0	0
cmrc8sgou0017og46w9sxj291	cmrc8sgot0015og46p81zhch5	YouTube	https://youtube.com/ditofreaky	0	0	0
cmrc8sgov0019og469kn3ixnb	cmrc8sgot0015og46p81zhch5	Audiomack	https://audiomack.com/ditofreaky	0	0	0
cmrc8sgov001bog469eb870qh	cmrc8sgot0015og46p81zhch5	SoundCloud	https://soundcloud.com/ditofreaky	0	0	0
cmrc8sgqx001gog46f3c4j45m	cmrc8sgqv001eog463st8ln5y	YouTube	https://youtube.com/busy	0	0	0
cmrc8sgqx001iog46rgqsr1oo	cmrc8sgqv001eog463st8ln5y	Audiomack	https://audiomack.com/busy	0	0	0
cmrc8sgqy001kog46yy30iip2	cmrc8sgqv001eog463st8ln5y	Mixcloud	https://mixcloud.com/busy	0	0	0
cmrc8sgsz001pog464m519vgj	cmrc8sgsy001nog46czhyoje2	YouTube	https://youtube.com/kaywizesalone	0	0	0
cmrc8sgt0001rog46b41qhuss	cmrc8sgsy001nog46czhyoje2	Audiomack	https://audiomack.com/kaywizesalone	0	0	0
cmrc8sgt0001tog46ient69ul	cmrc8sgsy001nog46czhyoje2	Mixcloud	https://mixcloud.com/kaywizesalone	0	0	0
cmrc8sgv1001yog460cw92yrn	cmrc8sgv0001wog46p43znrks	YouTube	https://youtube.com/djmaggie	0	0	0
cmrc8sgv20020og46cwnzuylj	cmrc8sgv0001wog46p43znrks	Audiomack	https://audiomack.com/djmaggie	0	0	0
cmrc8sgv20022og46l1aqv1as	cmrc8sgv0001wog46p43znrks	SoundCloud	https://soundcloud.com/djmaggie	0	0	0
cmrc8sgxe0027og46i46skcav	cmrc8sgxd0025og4614k7xmmf	YouTube	https://youtube.com/switch	0	0	0
cmrc8sgxf0029og46cc1z0c10	cmrc8sgxd0025og4614k7xmmf	Audiomack	https://audiomack.com/switch	0	0	0
cmrc8sgxg002bog46jalyo14j	cmrc8sgxd0025og4614k7xmmf	Mixcloud	https://mixcloud.com/switch	0	0	0
cmrc8sgzi002gog46fnvk4gy0	cmrc8sgzh002eog46wl5ta564	YouTube	https://youtube.com/bow	0	0	0
cmrc8sgzi002iog4670b1mcmz	cmrc8sgzh002eog46wl5ta564	Audiomack	https://audiomack.com/bow	0	0	0
cmrc8sgzj002kog469sw6v3rk	cmrc8sgzh002eog46wl5ta564	SoundCloud	https://soundcloud.com/bow	0	0	0
cmrc8sh1k002pog46bhf38wa9	cmrc8sh1j002nog46k3mmr9a1	YouTube	https://youtube.com/min1	0	0	0
cmrc8sh1l002rog46hnaauqz5	cmrc8sh1j002nog46k3mmr9a1	Audiomack	https://audiomack.com/min1	0	0	0
cmrc8sh1m002tog4655ht9ekv	cmrc8sh1j002nog46k3mmr9a1	Mixcloud	https://mixcloud.com/min1	0	0	0
cmrc8sh3n002yog46vthr9712	cmrc8sh3m002wog46me7yhlsg	YouTube	https://youtube.com/flex	0	0	0
cmrc8sh3n0030og467p7oh7af	cmrc8sh3m002wog46me7yhlsg	Audiomack	https://audiomack.com/flex	0	0	0
cmrc8sh3o0032og46jv37iny6	cmrc8sh3m002wog46me7yhlsg	SoundCloud	https://soundcloud.com/flex	0	0	0
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: soundit
--

COPY public.users (id, email, password, "googleId", phone, "phoneVerified", "phoneOtp", "phoneOtpExpiry", role, "createdAt", "updatedAt", avatar, bio, "emailVerified", "favoriteGenres", "lastLoginAt", location, name, "passwordResetExpiry", "passwordResetToken", "socialLinks", status, username) FROM stdin;
cmrc8sfu90000og469naa7l6f	user1@example.com	$2b$10$YLwHxr5HVnJQ9Wd6lJ0EEegpd0IjSdN32PuQnvhcaO./2lTB/Ox02	\N	\N	f	\N	\N	USER	2026-07-08 15:38:11.122	2026-07-08 15:38:11.122	\N	\N	f	{}	\N	\N	\N	\N	\N	\N	ACTIVE	user1
cmrc8sfwh0001og46zptnzybl	user2@example.com	$2b$10$udFpVY9SC1IrBTcDSYlqiOTdQ.ycG.7XlIJAP8nrmSwF/fX5t2D5W	\N	\N	f	\N	\N	USER	2026-07-08 15:38:11.201	2026-07-08 15:38:11.201	\N	\N	f	{}	\N	\N	\N	\N	\N	\N	ACTIVE	user2
cmrc8sfyh0002og463wo0b9l7	user3@example.com	$2b$10$ncA8FyOeENWKvetq68VSbuRMgHC9dYVyM3Wkiic5ec4i2tf2Yjv1.	\N	\N	f	\N	\N	USER	2026-07-08 15:38:11.273	2026-07-08 15:38:11.273	\N	\N	f	{}	\N	\N	\N	\N	\N	\N	ACTIVE	user3
cmrc8sg0g0003og46hwm5pjmc	user4@example.com	$2b$10$6Hh606MN.j1Z50wVTWro1eUhluODdVBv7CQ9aoJ6nVNpZki8yp7we	\N	\N	f	\N	\N	USER	2026-07-08 15:38:11.345	2026-07-08 15:38:11.345	\N	\N	f	{}	\N	\N	\N	\N	\N	\N	ACTIVE	user4
cmrc8sg2g0004og46p6se7yxc	user5@example.com	$2b$10$bkbONyNFbPnTvM/QCpanp.RNnhd6xej9pLskMZ8CFIt4HgIK/wRka	\N	\N	f	\N	\N	USER	2026-07-08 15:38:11.417	2026-07-08 15:38:11.417	\N	\N	f	{}	\N	\N	\N	\N	\N	\N	ACTIVE	user5
cmrc8sg4g0005og46t26e1ltg	user6@example.com	$2b$10$9uCs5sx.EwMb5dudUIajs.2I32hXXx39SMi2LTdj0lgpRI58vpjJ.	\N	\N	f	\N	\N	USER	2026-07-08 15:38:11.488	2026-07-08 15:38:11.488	\N	\N	f	{}	\N	\N	\N	\N	\N	\N	ACTIVE	user6
cmrc8sg6f0006og46t2490pfc	user7@example.com	$2b$10$k7vVrbUB5AK7Y9ZWgEuH.utnTV20evWYvMpVJQs0gYPl7LTB7c1Qm	\N	\N	f	\N	\N	USER	2026-07-08 15:38:11.56	2026-07-08 15:38:11.56	\N	\N	f	{}	\N	\N	\N	\N	\N	\N	ACTIVE	user7
cmrc8sg8f0007og46djtw7fmi	user8@example.com	$2b$10$e5iEJKzuet49F2.udsAoTO9Lvrtjf.SNG18IeS3ImTKjSrqvmACHG	\N	\N	f	\N	\N	USER	2026-07-08 15:38:11.632	2026-07-08 15:38:11.632	\N	\N	f	{}	\N	\N	\N	\N	\N	\N	ACTIVE	user8
cmrc8sgaf0008og46lcpnygt0	user9@example.com	$2b$10$n6Tr3k59jkyZJVFlqAXEW.jUhrrHU9qAfeWb5/DO6J4ztS9FCGLPC	\N	\N	f	\N	\N	USER	2026-07-08 15:38:11.703	2026-07-08 15:38:11.703	\N	\N	f	{}	\N	\N	\N	\N	\N	\N	ACTIVE	user9
cmrc8sgce0009og46evvhn8pf	user10@example.com	$2b$10$pty4b0hP8fcyKuLLhS6sXuklsC5L0VPGRwaoo7kjmOAwzbTm.3fVm	\N	\N	f	\N	\N	USER	2026-07-08 15:38:11.774	2026-07-08 15:38:11.774	\N	\N	f	{}	\N	\N	\N	\N	\N	\N	ACTIVE	user10
cmrc8sged000aog46lzepry1f	user11@example.com	$2b$10$.nqtMvdw0WFKpmm.pnKMlOWnJATvPJKzBHDlbhwc5HnqrmWyzhpdC	\N	\N	f	\N	\N	USER	2026-07-08 15:38:11.846	2026-07-08 15:38:11.846	\N	\N	f	{}	\N	\N	\N	\N	\N	\N	ACTIVE	user11
cmrc8sggc000bog4687d8mx5r	user12@example.com	$2b$10$pO6x8foaSosRLnC/nOPhje2nf0.x.PrFFBeOShsBR7NpviVhmfCnu	\N	\N	f	\N	\N	USER	2026-07-08 15:38:11.917	2026-07-08 15:38:11.917	\N	\N	f	{}	\N	\N	\N	\N	\N	\N	ACTIVE	user12
cmrc8sgig000cog46kki1t1ix	fredmax@soundit.sl	$2b$10$JfAfyolWnDwlV6N7wCFvHuXJRdZWPRlAMSnRWW7nDn7EV3fWVuJti	\N	\N	f	\N	\N	DJ	2026-07-08 15:38:11.992	2026-07-08 15:38:11.992	\N	\N	f	{}	\N	\N	\N	\N	\N	\N	ACTIVE	fredmax
cmrc8sgkl000log46pgtt2eye	rampage@soundit.sl	$2b$10$pgQOgZ9TfvHQkYKPoLVJ5Oc550skOqOcChF4N9JmbgYDW/gO0f.TW	\N	\N	f	\N	\N	DJ	2026-07-08 15:38:12.07	2026-07-08 15:38:12.07	\N	\N	f	{}	\N	\N	\N	\N	\N	\N	ACTIVE	rampage
cmrc8sgmo000uog46yqcy26tr	cess@soundit.sl	$2b$10$l9bfb31oIOpo8BYvQWfrou01EenGKcojos4pawQyUK7jLTSUKRyru	\N	\N	f	\N	\N	DJ	2026-07-08 15:38:12.145	2026-07-08 15:38:12.145	\N	\N	f	{}	\N	\N	\N	\N	\N	\N	ACTIVE	cess
cmrc8sgor0013og46a4pzanx5	ditofreaky@soundit.sl	$2b$10$SnpLdNeNLHQk0SKSwfnQvOEqnc.Qs7xe.7m6K/tek2DDTCjoUxtfO	\N	\N	f	\N	\N	DJ	2026-07-08 15:38:12.219	2026-07-08 15:38:12.219	\N	\N	f	{}	\N	\N	\N	\N	\N	\N	ACTIVE	ditofreaky
cmrc8sgqu001cog46rcob47ny	busy@soundit.sl	$2b$10$NvUFYKBDTpFB2P0ODB9idOsldBMuv7ND9.irM2V/7t62J8q7.ptV2	\N	\N	f	\N	\N	DJ	2026-07-08 15:38:12.294	2026-07-08 15:38:12.294	\N	\N	f	{}	\N	\N	\N	\N	\N	\N	ACTIVE	busy
cmrc8sgsw001log46a0m6yz0a	kaywizesalone@soundit.sl	$2b$10$.6TAaVyagKz166RGA3YCqOfKvDZG6rrdz.pka1bK2v.GyZdunBejS	\N	\N	f	\N	\N	DJ	2026-07-08 15:38:12.369	2026-07-08 15:38:12.369	\N	\N	f	{}	\N	\N	\N	\N	\N	\N	ACTIVE	kaywizesalone
cmrc8sguz001uog46pts467sk	djmaggie@soundit.sl	$2b$10$D9LvRNt/y./qaKYDyYVELOHvIwPBtv44Eacnz0kFXteJuIyOtW6kW	\N	\N	f	\N	\N	DJ	2026-07-08 15:38:12.443	2026-07-08 15:38:12.443	\N	\N	f	{}	\N	\N	\N	\N	\N	\N	ACTIVE	djmaggie
cmrc8sgxb0023og46jv4kcumy	switch@soundit.sl	$2b$10$k9ZF42Ws3/c5R2m.cZinqeU2mYLVyw5GpwMF.uvvYUmMBEOoVJ6..	\N	\N	f	\N	\N	DJ	2026-07-08 15:38:12.528	2026-07-08 15:38:12.528	\N	\N	f	{}	\N	\N	\N	\N	\N	\N	ACTIVE	switch
cmrc8sgzf002cog46tktvf4ak	bow@soundit.sl	$2b$10$rahlvF5kRYd10eob1ZmSDeDsoXa6fomzjQGW7WD174vVABuFIhJDG	\N	\N	f	\N	\N	DJ	2026-07-08 15:38:12.604	2026-07-08 15:38:12.604	\N	\N	f	{}	\N	\N	\N	\N	\N	\N	ACTIVE	bow
cmrc8sh1i002log46vfn84ruy	min1@soundit.sl	$2b$10$gR4XUMDLoLn/yybwmaMkxO1wvgYvrx8JC73qfuv6K6QWv4HPdyVqu	\N	\N	f	\N	\N	DJ	2026-07-08 15:38:12.678	2026-07-08 15:38:12.678	\N	\N	f	{}	\N	\N	\N	\N	\N	\N	ACTIVE	min1
cmrc8sh3l002uog46gvz1wpph	flex@soundit.sl	$2b$10$xAuYxVmryt7mjXrtVHlqEO7uJzNnvzIlW2FwKafrrDrLWXHS8NXQu	\N	\N	f	\N	\N	DJ	2026-07-08 15:38:12.753	2026-07-08 15:38:12.753	\N	\N	f	{}	\N	\N	\N	\N	\N	\N	ACTIVE	flex
cmrc8shba009pog46w4o754bl	admin@soundit.sl	$2b$10$bq9jnEs8cKwHRG.Ulf2iyujRwU/Gar.W7wy.PB0IvmCAGj2DdOKVq	\N	\N	f	\N	\N	ADMIN	2026-07-08 15:38:13.03	2026-07-08 15:38:13.03	\N	\N	f	{}	\N	\N	\N	\N	\N	\N	ACTIVE	admin
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: ad_campaigns ad_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.ad_campaigns
    ADD CONSTRAINT ad_campaigns_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: battle_entries battle_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.battle_entries
    ADD CONSTRAINT battle_entries_pkey PRIMARY KEY (id);


--
-- Name: battle_votes battle_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.battle_votes
    ADD CONSTRAINT battle_votes_pkey PRIMARY KEY (id);


--
-- Name: battles battles_pkey; Type: CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.battles
    ADD CONSTRAINT battles_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: dj_photos dj_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.dj_photos
    ADD CONSTRAINT dj_photos_pkey PRIMARY KEY (id);


--
-- Name: dj_profiles dj_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.dj_profiles
    ADD CONSTRAINT dj_profiles_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: follows follows_pkey; Type: CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_pkey PRIMARY KEY (id);


--
-- Name: gig_applications gig_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.gig_applications
    ADD CONSTRAINT gig_applications_pkey PRIMARY KEY (id);


--
-- Name: gigs gigs_pkey; Type: CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.gigs
    ADD CONSTRAINT gigs_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: mix_likes mix_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.mix_likes
    ADD CONSTRAINT mix_likes_pkey PRIMARY KEY (id);


--
-- Name: mixes mixes_pkey; Type: CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.mixes
    ADD CONSTRAINT mixes_pkey PRIMARY KEY (id);


--
-- Name: opp_applications opp_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.opp_applications
    ADD CONSTRAINT opp_applications_pkey PRIMARY KEY (id);


--
-- Name: opportunities opportunities_pkey; Type: CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: pro_subscription_requests pro_subscription_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.pro_subscription_requests
    ADD CONSTRAINT pro_subscription_requests_pkey PRIMARY KEY (id);


--
-- Name: ranking_history ranking_history_pkey; Type: CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.ranking_history
    ADD CONSTRAINT ranking_history_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: streaming_platforms streaming_platforms_pkey; Type: CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.streaming_platforms
    ADD CONSTRAINT streaming_platforms_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ad_campaigns_advertiserId_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "ad_campaigns_advertiserId_idx" ON public.ad_campaigns USING btree ("advertiserId");


--
-- Name: ad_campaigns_status_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX ad_campaigns_status_idx ON public.ad_campaigns USING btree (status);


--
-- Name: ad_campaigns_targetType_status_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "ad_campaigns_targetType_status_idx" ON public.ad_campaigns USING btree ("targetType", status);


--
-- Name: audit_logs_action_entity_createdAt_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "audit_logs_action_entity_createdAt_idx" ON public.audit_logs USING btree (action, entity, "createdAt");


--
-- Name: audit_logs_actorId_createdAt_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "audit_logs_actorId_createdAt_idx" ON public.audit_logs USING btree ("actorId", "createdAt");


--
-- Name: audit_logs_targetId_createdAt_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "audit_logs_targetId_createdAt_idx" ON public.audit_logs USING btree ("targetId", "createdAt");


--
-- Name: battle_entries_battleId_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "battle_entries_battleId_idx" ON public.battle_entries USING btree ("battleId");


--
-- Name: battle_entries_djId_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "battle_entries_djId_idx" ON public.battle_entries USING btree ("djId");


--
-- Name: battle_entries_finalScore_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "battle_entries_finalScore_idx" ON public.battle_entries USING btree ("finalScore");


--
-- Name: battle_votes_entryId_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "battle_votes_entryId_idx" ON public.battle_votes USING btree ("entryId");


--
-- Name: battle_votes_entryId_userId_key; Type: INDEX; Schema: public; Owner: soundit
--

CREATE UNIQUE INDEX "battle_votes_entryId_userId_key" ON public.battle_votes USING btree ("entryId", "userId");


--
-- Name: battle_votes_userId_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "battle_votes_userId_idx" ON public.battle_votes USING btree ("userId");


--
-- Name: battles_status_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX battles_status_idx ON public.battles USING btree (status);


--
-- Name: battles_weekStart_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "battles_weekStart_idx" ON public.battles USING btree ("weekStart");


--
-- Name: bookings_clientId_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "bookings_clientId_idx" ON public.bookings USING btree ("clientId");


--
-- Name: bookings_djId_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "bookings_djId_idx" ON public.bookings USING btree ("djId");


--
-- Name: bookings_eventDate_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "bookings_eventDate_idx" ON public.bookings USING btree ("eventDate");


--
-- Name: bookings_status_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX bookings_status_idx ON public.bookings USING btree (status);


--
-- Name: dj_photos_djId_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "dj_photos_djId_idx" ON public.dj_photos USING btree ("djId");


--
-- Name: dj_profiles_city_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX dj_profiles_city_idx ON public.dj_profiles USING btree (city);


--
-- Name: dj_profiles_isPublic_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "dj_profiles_isPublic_idx" ON public.dj_profiles USING btree ("isPublic");


--
-- Name: dj_profiles_rankingScore_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "dj_profiles_rankingScore_idx" ON public.dj_profiles USING btree ("rankingScore");


--
-- Name: dj_profiles_userId_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "dj_profiles_userId_idx" ON public.dj_profiles USING btree ("userId");


--
-- Name: dj_profiles_userId_key; Type: INDEX; Schema: public; Owner: soundit
--

CREATE UNIQUE INDEX "dj_profiles_userId_key" ON public.dj_profiles USING btree ("userId");


--
-- Name: dj_profiles_verificationStatus_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "dj_profiles_verificationStatus_idx" ON public.dj_profiles USING btree ("verificationStatus");


--
-- Name: dj_profiles_verified_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX dj_profiles_verified_idx ON public.dj_profiles USING btree (verified);


--
-- Name: events_city_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX events_city_idx ON public.events USING btree (city);


--
-- Name: events_date_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX events_date_idx ON public.events USING btree (date);


--
-- Name: events_djId_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "events_djId_idx" ON public.events USING btree ("djId");


--
-- Name: events_isSyncedToSalone_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "events_isSyncedToSalone_idx" ON public.events USING btree ("isSyncedToSalone");


--
-- Name: events_soundItSaloneEventId_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "events_soundItSaloneEventId_idx" ON public.events USING btree ("soundItSaloneEventId");


--
-- Name: follows_djId_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "follows_djId_idx" ON public.follows USING btree ("djId");


--
-- Name: follows_userId_djId_key; Type: INDEX; Schema: public; Owner: soundit
--

CREATE UNIQUE INDEX "follows_userId_djId_key" ON public.follows USING btree ("userId", "djId");


--
-- Name: follows_userId_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "follows_userId_idx" ON public.follows USING btree ("userId");


--
-- Name: gig_applications_djId_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "gig_applications_djId_idx" ON public.gig_applications USING btree ("djId");


--
-- Name: gig_applications_gigId_djId_key; Type: INDEX; Schema: public; Owner: soundit
--

CREATE UNIQUE INDEX "gig_applications_gigId_djId_key" ON public.gig_applications USING btree ("gigId", "djId");


--
-- Name: gig_applications_gigId_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "gig_applications_gigId_idx" ON public.gig_applications USING btree ("gigId");


--
-- Name: gig_applications_status_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX gig_applications_status_idx ON public.gig_applications USING btree (status);


--
-- Name: gigs_city_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX gigs_city_idx ON public.gigs USING btree (city);


--
-- Name: gigs_clientToken_key; Type: INDEX; Schema: public; Owner: soundit
--

CREATE UNIQUE INDEX "gigs_clientToken_key" ON public.gigs USING btree ("clientToken");


--
-- Name: gigs_createdAt_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "gigs_createdAt_idx" ON public.gigs USING btree ("createdAt");


--
-- Name: gigs_eventDate_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "gigs_eventDate_idx" ON public.gigs USING btree ("eventDate");


--
-- Name: gigs_status_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX gigs_status_idx ON public.gigs USING btree (status);


--
-- Name: messages_bookingId_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "messages_bookingId_idx" ON public.messages USING btree ("bookingId");


--
-- Name: messages_createdAt_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "messages_createdAt_idx" ON public.messages USING btree ("createdAt");


--
-- Name: messages_receiverId_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "messages_receiverId_idx" ON public.messages USING btree ("receiverId");


--
-- Name: messages_senderId_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "messages_senderId_idx" ON public.messages USING btree ("senderId");


--
-- Name: mix_likes_mixId_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "mix_likes_mixId_idx" ON public.mix_likes USING btree ("mixId");


--
-- Name: mix_likes_mixId_userId_key; Type: INDEX; Schema: public; Owner: soundit
--

CREATE UNIQUE INDEX "mix_likes_mixId_userId_key" ON public.mix_likes USING btree ("mixId", "userId");


--
-- Name: mix_likes_userId_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "mix_likes_userId_idx" ON public.mix_likes USING btree ("userId");


--
-- Name: mixes_category_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX mixes_category_idx ON public.mixes USING btree (category);


--
-- Name: mixes_createdAt_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "mixes_createdAt_idx" ON public.mixes USING btree ("createdAt");


--
-- Name: mixes_djId_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "mixes_djId_idx" ON public.mixes USING btree ("djId");


--
-- Name: mixes_featured_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX mixes_featured_idx ON public.mixes USING btree (featured);


--
-- Name: mixes_genre_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX mixes_genre_idx ON public.mixes USING btree (genre);


--
-- Name: opp_applications_djId_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "opp_applications_djId_idx" ON public.opp_applications USING btree ("djId");


--
-- Name: opp_applications_opportunityId_djId_key; Type: INDEX; Schema: public; Owner: soundit
--

CREATE UNIQUE INDEX "opp_applications_opportunityId_djId_key" ON public.opp_applications USING btree ("opportunityId", "djId");


--
-- Name: opp_applications_opportunityId_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "opp_applications_opportunityId_idx" ON public.opp_applications USING btree ("opportunityId");


--
-- Name: opportunities_eventDate_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "opportunities_eventDate_idx" ON public.opportunities USING btree ("eventDate");


--
-- Name: opportunities_isFeatured_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "opportunities_isFeatured_idx" ON public.opportunities USING btree ("isFeatured");


--
-- Name: opportunities_requiredTier_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "opportunities_requiredTier_idx" ON public.opportunities USING btree ("requiredTier");


--
-- Name: opportunities_status_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX opportunities_status_idx ON public.opportunities USING btree (status);


--
-- Name: payments_bookingId_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "payments_bookingId_idx" ON public.payments USING btree ("bookingId");


--
-- Name: payments_clientId_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "payments_clientId_idx" ON public.payments USING btree ("clientId");


--
-- Name: payments_providerRef_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "payments_providerRef_idx" ON public.payments USING btree ("providerRef");


--
-- Name: payments_status_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX payments_status_idx ON public.payments USING btree (status);


--
-- Name: pro_subscription_requests_createdAt_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "pro_subscription_requests_createdAt_idx" ON public.pro_subscription_requests USING btree ("createdAt");


--
-- Name: pro_subscription_requests_djId_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "pro_subscription_requests_djId_idx" ON public.pro_subscription_requests USING btree ("djId");


--
-- Name: pro_subscription_requests_status_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX pro_subscription_requests_status_idx ON public.pro_subscription_requests USING btree (status);


--
-- Name: ranking_history_djId_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "ranking_history_djId_idx" ON public.ranking_history USING btree ("djId");


--
-- Name: ranking_history_week_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX ranking_history_week_idx ON public.ranking_history USING btree (week);


--
-- Name: reviews_createdAt_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "reviews_createdAt_idx" ON public.reviews USING btree ("createdAt");


--
-- Name: reviews_djId_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "reviews_djId_idx" ON public.reviews USING btree ("djId");


--
-- Name: reviews_rating_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX reviews_rating_idx ON public.reviews USING btree (rating);


--
-- Name: reviews_userId_djId_key; Type: INDEX; Schema: public; Owner: soundit
--

CREATE UNIQUE INDEX "reviews_userId_djId_key" ON public.reviews USING btree ("userId", "djId");


--
-- Name: streaming_platforms_djId_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "streaming_platforms_djId_idx" ON public.streaming_platforms USING btree ("djId");


--
-- Name: users_email_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX users_email_idx ON public.users USING btree (email);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: soundit
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: users_googleId_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "users_googleId_idx" ON public.users USING btree ("googleId");


--
-- Name: users_googleId_key; Type: INDEX; Schema: public; Owner: soundit
--

CREATE UNIQUE INDEX "users_googleId_key" ON public.users USING btree ("googleId");


--
-- Name: users_phone_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX users_phone_idx ON public.users USING btree (phone);


--
-- Name: users_phone_key; Type: INDEX; Schema: public; Owner: soundit
--

CREATE UNIQUE INDEX users_phone_key ON public.users USING btree (phone);


--
-- Name: users_role_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX users_role_idx ON public.users USING btree (role);


--
-- Name: users_status_role_createdAt_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX "users_status_role_createdAt_idx" ON public.users USING btree (status, role, "createdAt");


--
-- Name: users_username_idx; Type: INDEX; Schema: public; Owner: soundit
--

CREATE INDEX users_username_idx ON public.users USING btree (username);


--
-- Name: users_username_key; Type: INDEX; Schema: public; Owner: soundit
--

CREATE UNIQUE INDEX users_username_key ON public.users USING btree (username);


--
-- Name: ad_campaigns ad_campaigns_advertiserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.ad_campaigns
    ADD CONSTRAINT "ad_campaigns_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES public.dj_profiles(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_actorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_targetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "audit_logs_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: battle_entries battle_entries_battleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.battle_entries
    ADD CONSTRAINT "battle_entries_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES public.battles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: battle_entries battle_entries_djId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.battle_entries
    ADD CONSTRAINT "battle_entries_djId_fkey" FOREIGN KEY ("djId") REFERENCES public.dj_profiles(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: battle_votes battle_votes_entryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.battle_votes
    ADD CONSTRAINT "battle_votes_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES public.battle_entries(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: battle_votes battle_votes_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.battle_votes
    ADD CONSTRAINT "battle_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: bookings bookings_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "bookings_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: bookings bookings_djId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "bookings_djId_fkey" FOREIGN KEY ("djId") REFERENCES public.dj_profiles(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: dj_photos dj_photos_djId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.dj_photos
    ADD CONSTRAINT "dj_photos_djId_fkey" FOREIGN KEY ("djId") REFERENCES public.dj_profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: dj_profiles dj_profiles_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.dj_profiles
    ADD CONSTRAINT "dj_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: events events_djId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT "events_djId_fkey" FOREIGN KEY ("djId") REFERENCES public.dj_profiles(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: follows follows_djId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT "follows_djId_fkey" FOREIGN KEY ("djId") REFERENCES public.dj_profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: follows follows_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT "follows_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: gig_applications gig_applications_djId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.gig_applications
    ADD CONSTRAINT "gig_applications_djId_fkey" FOREIGN KEY ("djId") REFERENCES public.dj_profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: gig_applications gig_applications_gigId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.gig_applications
    ADD CONSTRAINT "gig_applications_gigId_fkey" FOREIGN KEY ("gigId") REFERENCES public.gigs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: messages messages_bookingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT "messages_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES public.bookings(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: messages messages_receiverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT "messages_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: messages messages_senderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: mix_likes mix_likes_mixId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.mix_likes
    ADD CONSTRAINT "mix_likes_mixId_fkey" FOREIGN KEY ("mixId") REFERENCES public.mixes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: mix_likes mix_likes_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.mix_likes
    ADD CONSTRAINT "mix_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: mixes mixes_djId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.mixes
    ADD CONSTRAINT "mixes_djId_fkey" FOREIGN KEY ("djId") REFERENCES public.dj_profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: opp_applications opp_applications_djId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.opp_applications
    ADD CONSTRAINT "opp_applications_djId_fkey" FOREIGN KEY ("djId") REFERENCES public.dj_profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: opp_applications opp_applications_opportunityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.opp_applications
    ADD CONSTRAINT "opp_applications_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES public.opportunities(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payments payments_bookingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "payments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES public.bookings(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payments payments_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "payments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pro_subscription_requests pro_subscription_requests_djId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.pro_subscription_requests
    ADD CONSTRAINT "pro_subscription_requests_djId_fkey" FOREIGN KEY ("djId") REFERENCES public.dj_profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ranking_history ranking_history_djId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.ranking_history
    ADD CONSTRAINT "ranking_history_djId_fkey" FOREIGN KEY ("djId") REFERENCES public.dj_profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reviews reviews_djId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT "reviews_djId_fkey" FOREIGN KEY ("djId") REFERENCES public.dj_profiles(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: reviews reviews_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: streaming_platforms streaming_platforms_djId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: soundit
--

ALTER TABLE ONLY public.streaming_platforms
    ADD CONSTRAINT "streaming_platforms_djId_fkey" FOREIGN KEY ("djId") REFERENCES public.dj_profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: soundit
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict mrVRqZ3ocOWWjqDzkZ56hVzhQQAwy78uEZR19hCERfdRVk84pQYfNKgNitkV3BC

