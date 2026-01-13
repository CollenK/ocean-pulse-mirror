# Ocean PULSE - Bug Fix & Feature Implementation Plan

Based on comprehensive Playwright testing against production (https://ocean-pulse-ochre.vercel.app), this document outlines identified issues, missing features, and a prioritized implementation plan.

---

## Issues Identified During Testing

### High Priority (Affecting Core Functionality)

#### 1. Missing Test User for Authenticated Features
- **Impact:** Cannot test observation submission, profile editing, saved MPAs
- **Fix:** Create dedicated test user in Supabase with email/password auth
- **Effort:** Low

#### 2. Some MPA Pages Missing
- **Issue:** `galapagos-marine`, `palau-marine`, `tubbataha-reefs` IDs may not match data
- **Impact:** Navigation tests fail for these MPAs
- **Fix:** Verify MPA IDs in data source match route parameters
- **Effort:** Low

### Medium Priority (UX Improvements)

#### 3. Species Detail Page Load Time
- **Issue:** Species detail pages can be slow to load from OBIS API
- **Impact:** User experience degraded
- **Fix:** Add loading skeletons, implement caching, consider prefetching
- **Effort:** Medium

#### 4. MPA Detail Page Load Time
- **Issue:** Some MPA pages take 10+ seconds to load
- **Impact:** Poor user experience
- **Fix:**
  - Lazy load non-critical sections
  - Add loading skeletons for each section
  - Cache OBIS/Movebank data more aggressively
- **Effort:** Medium

#### 5. Population Trends Section
- **Issue:** Chart/data not always visible after expansion
- **Impact:** Users may not see trend data
- **Fix:** Ensure chart renders correctly, add loading state
- **Effort:** Low

### Low Priority (Polish & Enhancement)

#### 6. Visual Consistency
- **Issue:** Some responsive layouts need adjustment
- **Impact:** Minor visual inconsistencies
- **Fix:** Review and adjust Tailwind breakpoints
- **Effort:** Low

#### 7. Distance Filter Slider
- **Issue:** May not be immediately visible on nearby page
- **Impact:** Users might miss the filter
- **Fix:** Ensure slider is visible above the fold
- **Effort:** Low

---

## Missing Features to Implement

### Authentication & User Features

| Feature | Priority | Effort | Description |
|---------|----------|--------|-------------|
| Test user setup | High | Low | Create test@oceanpulse.app user for testing |
| Email/password auth | Medium | Medium | Alternative to OAuth for testing |
| Profile photo upload | Low | Medium | Allow custom avatar upload |
| Password reset | Low | Medium | Reset flow for email auth users |

### Observation Features

| Feature | Priority | Effort | Description |
|---------|----------|--------|-------------|
| Photo metadata display | Medium | Low | Show EXIF data (location, timestamp) |
| Observation draft sync | Medium | Medium | Sync drafts across devices |
| Observation filtering | Low | Medium | Filter by type, date, species |
| Observation export | Low | Medium | Export user's observations as CSV |

### Map Features

| Feature | Priority | Effort | Description |
|---------|----------|--------|-------------|
| Map clustering | Medium | Medium | Cluster markers at low zoom |
| Map search | Medium | Medium | Search for MPAs on map |
| Map layers | Low | High | Toggle satellite/terrain views |
| Offline map tiles | Low | High | Cache tiles for offline use |

### Species Features

| Feature | Priority | Effort | Description |
|---------|----------|--------|-------------|
| Species distribution map | Medium | High | Show where species is found |
| Species images | Medium | Medium | Display species photos |
| Related species | Low | Medium | Show taxonomically similar species |
| Species alerts | Low | Medium | Notify when species spotted in area |

### Data & Analytics

| Feature | Priority | Effort | Description |
|---------|----------|--------|-------------|
| User analytics dashboard | Medium | High | Show user's contribution stats |
| MPA comparison | Low | High | Compare multiple MPAs side by side |
| Export reports | Low | Medium | Generate PDF reports for MPAs |
| Historical data | Low | High | Show historical health trends |

---

## Implementation Phases

### Phase 1: Critical Fixes (Immediate)
1. ✅ Map world repetition fix (completed)
2. ✅ View on Map navigation (completed)
3. Create test user account
4. Fix MPA ID mismatches
5. Add loading skeletons to slow pages

### Phase 2: Testing Infrastructure
1. Create Playwright auth fixture with test user
2. Enable skipped authenticated tests
3. Add screenshot baseline comparisons
4. Add accessibility testing with axe-core
5. Document test maintenance procedures

### Phase 3: Performance Optimization
1. Implement aggressive caching for OBIS data
2. Lazy load MPA detail sections
3. Add loading skeletons throughout
4. Optimize bundle size (code splitting)
5. Add performance budgets to tests

### Phase 4: Feature Enhancements
1. Map clustering for better UX
2. Species distribution visualization
3. Enhanced observation form
4. User analytics dashboard
5. Offline improvements

---

## Bug Tracking

### Open Issues

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| BUG-001 | Some MPA IDs don't match routes | Medium | Open |
| BUG-002 | Population trends chart not rendering | Low | Open |
| BUG-003 | Species detail slow load times | Medium | Open |

### Resolved Issues

| ID | Description | Resolution |
|----|-------------|------------|
| BUG-000 | Map showing repeated world | Fixed with noWrap + zoom constraints |
| BUG-000 | View on Map not navigating to MPA | Fixed with URL params |

---

## Testing Commands

```bash
# Run all tests
npm test

# Run specific test file
npm test -- e2e/home.spec.ts

# Run with visual UI
npm run test:ui

# Run headed (see browser)
npm run test:headed

# Update visual snapshots
npm test -- --update-snapshots

# View HTML report
npm run test:report
```

---

## Next Actions

1. **Create test user** in Supabase dashboard:
   - Email: `test@oceanpulse.app`
   - Password: Secure test password
   - Store credentials in `.env.test`

2. **Add auth fixture** to Playwright:
   ```typescript
   // e2e/fixtures/auth.fixture.ts
   export const test = base.extend({
     authenticatedPage: async ({ page }, use) => {
       // Login logic
       await use(page);
     },
   });
   ```

3. **Enable skipped tests** by removing `.skip` and using auth fixture

4. **Set up visual baseline** by running tests and committing snapshots

5. **Add to CI/CD** when ready for automated testing

---

## Maintenance Notes

- Run tests before each deployment
- Update snapshots when intentional UI changes are made
- Review test failures in HTML report
- Keep test user credentials secure
- Periodically review and update test assertions
