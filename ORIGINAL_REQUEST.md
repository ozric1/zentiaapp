# Original User Request

## Initial Request — 2026-09-02T19:09:59+01:00

# Teamwork Project Prompt — Draft

Add a fully functional Firebase-backed login system, user-specific progress tracking, and a personalized dashboard to the Zentia learning app.

Working directory: c:/Users/USER/OneDrive/Desktop/Projects/zentia-world-program
Integrity mode: demo

## Requirements

### R1. Authentication System
Implement a login page supporting Email/Password and Google Sign-In. Protect the app's core routes (`/dashboard`, `/programs/business-english`) so that unauthenticated users are redirected to the login page. Assume the Firebase project is `zentia-573f8`.

### R2. Robust Firestore Progress Tracking
Migrate the existing `localStorage` progress logic to Firestore. Create a user-specific database structure that stores the completed lessons array, quiz scores, and detailed progress metrics under the user's UID. 
*Note:* The architecture must be built assuming thousands of concurrent users. Implement robust error handling, loading states, and flawless data fetching to ensure data is stored and displayed perfectly with zero margin for error.

### R3. Personalized Dashboard & Resume Learning
Enhance the Learner Dashboard to fetch and display the authenticated user's real-time progress metrics from Firestore. Include a "Continue Learning" mechanism that identifies where the user left off and directs them to the correct lesson.

## Acceptance Criteria

### Authentication
- [ ] Navigating to `/dashboard` while logged out redirects the user to the login page.
- [ ] Users can successfully authenticate and log in using Email/Password.

### Data Persistence & Integrity
- [ ] Completing a lesson successfully saves the updated progress array and quiz scores to a Firestore document corresponding to the user's UID.
- [ ] Data operations (read/write) must include robust error handling and loading states to flawlessly support high concurrency without failing.
- [ ] Refreshing the page retains the user's progress by fetching it reliably from Firestore (replacing `localStorage`).

### Dashboard & Navigation
- [ ] The dashboard successfully retrieves and flawlessly displays the logged-in user's data.
- [ ] A "Continue Learning" button successfully routes the user to their next uncompleted lesson.

## Follow-up - 2026-09-29T21:59:40Z

# Teamwork Project Prompt — Draft

> Requested team: Use a very large team of agents.

Build a mobile-first executive training application for Zentia with a freemium and 3-tier subscription model, integrating AI roleplay, audio-first modules, and automated B2B onboarding.

Working directory: c:/Users/USER/OneDrive/Desktop/Projects/zentia-mobile
Integrity mode: demo

## Requirements

### R1. Native App Infrastructure & Freemium Content
Initialize a new React Native (Expo) application. Implement the 15-module curriculum structure. Ensure Module 1 is completely free and accessible without a subscription to act as the top-of-funnel hook. Connect the app to Firebase for user authentication and data persistence.

### R2. Subscription Tiers & Audio Mode (Tier 1)
Integrate RevenueCat to handle paywalls and subscription state. Implement Tier 1 which unlocks all 15 modules and an "Audio-First Executive Mode" that allows users to listen to lessons seamlessly on mobile.

### R3. AI Executive Roleplay Simulator (Tier 2)
Implement a higher-priced Tier 2 that unlocks an AI coaching feature. Use the OpenAI API to build an interactive roleplay simulator where executives can practice pitches and receive automated structural feedback via text or voice.

### R4. B2B Seat Management
Create an automated onboarding flow where corporate buyers can upload a CSV of employees to grant them bulk access to the platform without manual admin intervention.

## Acceptance Criteria

### Infrastructure & Monetization
- [ ] The app successfully compiles and runs via Expo.
- [ ] Users can create an account via Firebase Auth.
- [ ] RevenueCat paywalls correctly block access to Modules 2-15 for non-subscribed users while keeping Module 1 free.

### Core Features
- [ ] The Audio-First Executive mode successfully plays lesson content.
- [ ] The Tier 2 AI Simulator accepts text prompts and returns contextual coaching feedback using the OpenAI API.
- [ ] The B2B onboarding feature successfully parses a CSV file of emails and generates access records in the database.
