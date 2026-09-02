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
