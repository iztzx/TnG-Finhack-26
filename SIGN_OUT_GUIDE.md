# Sign Out Feature Guide

## Overview
Sign out functionality has been added for both regular users and admin users with enhanced UI/UX improvements.

## User Sign Out (Regular Dashboard)

### Location
Bottom of the left sidebar in the user dashboard

### Features
- **User Profile Section**: Shows company name and email
- **Avatar**: Circular avatar with user icon
- **Sign Out Button**: Clear button with logout icon
- **Collapsed Mode**: Works in both expanded and collapsed sidebar states

### How to Use
1. Navigate to any page in the user dashboard
2. Look at the bottom of the left sidebar
3. Click the "Sign Out" button
4. You'll be redirected to the login page

### Visual Elements
```
┌─────────────────────────────┐
│  [Avatar] Company Name      │
│           user@outandin.com │
├─────────────────────────────┤
│  [Logout Icon] Sign Out     │
├─────────────────────────────┤
│  System Status              │
│  ● All Systems Operational  │
└─────────────────────────────┘
```

## Admin Sign Out (Admin Dashboard)

### Location
Bottom of the left sidebar in the admin dashboard

### Features
- **Admin Profile Section**: Shows "Admin User" and email
- **Avatar**: Circular avatar with user icon in blue
- **Sign Out Button**: Styled for admin interface
- **Consistent Design**: Matches admin dashboard theme

### How to Use
1. Navigate to any page in the admin dashboard
2. Look at the bottom of the left sidebar
3. Click the "Sign Out" button
4. You'll be redirected to the login page

### Visual Elements
```
┌─────────────────────────────┐
│  [Avatar] Admin User        │
│           admin@outandin.com│
├─────────────────────────────┤
│  [Logout Icon] Sign Out     │
└─────────────────────────────┘
```

## Demo Quick Login (Login Page)

### New Feature
Added quick login buttons for easy testing

### Features
- **User Login Button**: Automatically fills user credentials
- **Admin Login Button**: Automatically fills admin credentials
- **One-Click Testing**: Perfect for demos and development

### How to Use
1. Go to the login page
2. Look for the "Demo Accounts" section below the login form
3. Click either "User Login" or "Admin Login"
4. Credentials will be auto-filled
5. Click "Sign In" to login

### Demo Credentials
- **User Account**:
  - Email: `user@outandin.com`
  - Password: `Demo@123`

- **Admin Account**:
  - Email: `admin@outandin.com`
  - Password: `Admin@123`

## Technical Details

### Authentication Flow
1. User clicks "Sign Out"
2. `handleSignOut()` function is called
3. `logout()` from AuthContext is executed
4. localStorage and sessionStorage are cleared
5. User state is reset to null
6. Navigation to `/login` with replace flag
7. User sees login page

### Code References

#### User Sidebar
```javascript
const handleSignOut = async () => {
  await logout();
  navigate('/login', { replace: true });
};
```

#### Admin Sidebar
```javascript
const handleSignOut = async () => {
  await logout();
  navigate('/login', { replace: true });
};
```

### State Management
- Uses `useAuth()` hook from AuthContext
- Accesses `logout()` function
- Accesses `userProfile` for display
- Uses `useNavigate()` for routing

## Accessibility Features

### Keyboard Navigation
- Tab to focus on sign out button
- Enter or Space to activate
- Focus indicators visible

### Screen Readers
- Proper ARIA labels
- Semantic HTML structure
- Clear button text

### Visual Feedback
- Hover effects on buttons
- Active states
- Loading states during logout

## Browser Support
- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers

## Troubleshooting

### Sign Out Not Working
1. Check browser console for errors
2. Verify AuthContext is properly configured
3. Check network tab for API calls
4. Clear browser cache and cookies

### Not Redirecting to Login
1. Verify react-router-dom is installed
2. Check navigation configuration
3. Ensure routes are properly defined

### Profile Not Showing
1. Check if userProfile is loaded
2. Verify AuthContext state
3. Check for console errors

## Related Files
- `frontend/src/components/Sidebar.jsx`
- `frontend/src/components/admin/AdminSidebar.jsx`
- `frontend/src/context/AuthContext.jsx`
- `frontend/src/pages/Login.jsx`

## Additional Improvements

### User Experience
- ✅ Smooth animations on hover
- ✅ Clear visual hierarchy
- ✅ Consistent design language
- ✅ Responsive layout

### Performance
- ✅ Minimal re-renders
- ✅ Efficient state updates
- ✅ Fast navigation
- ✅ Optimized animations

### Security
- ✅ Clears all session data
- ✅ Removes authentication tokens
- ✅ Prevents back navigation after logout
- ✅ Secure redirect to login
