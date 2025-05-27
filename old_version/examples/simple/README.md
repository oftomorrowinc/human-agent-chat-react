# Human Agent Chat - Rich Media Example

This example demonstrates an enhanced chat interface with support for rich media content, similar to modern messaging apps like Discord, Slack, and Microsoft Teams.

## Features

### Modern UI

- **Grid-based message layout** - Properly aligns avatars with message content
- **Color-coded avatars** - Algorithmic color generation based on user initials
- **Fixed message input** - Always visible at the bottom of the screen
- **Animated typing indicator** - Shows when other users are typing
- **Date dividers** - Separates messages by day

### Rich Media Content

- **YouTube embeds** - Automatically detects YouTube URLs and shows embeds
- **Image galleries** - Displays image attachments in a responsive grid
- **Lightbox viewer** - Click on images to open a fullscreen lightbox with navigation
- **Interactive forms** - Process and display Zod schemas as interactive forms
- **@mentions** - Highlights user mentions with @ symbol

## Technologies Used

- Express.js - Server-side rendering and API endpoints
- Pug - Templating engine for HTML generation
- Firebase - Realtime database and storage for chat data
- HTMX - Seamless server-side rendering and partial updates
- CSS Grid - Modern layout for message containers

## Usage Examples

### YouTube Videos

When a user sends a YouTube URL in a message, it's automatically converted to an embedded player:

```
Check out this video: https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

Features:
- Thumbnail preview with play button
- Expand/collapse buttons
- Open in YouTube link

### Image Galleries

When a user sends multiple image URLs in a message, they're displayed in a responsive grid:

```
Here are some images:
https://example.com/image1.jpg
https://example.com/image2.jpg
https://example.com/image3.jpg
```

Features:
- Up to 4 images in grid layout
- Larger first image for 3-image layout
- Lightbox with keyboard navigation (left/right/esc)

### Zod Schema Forms

When a user sends a Zod schema in a message, it's detected and presented as a form:

```
z.object({
  name: z.string().required(),
  email: z.string().email().required(),
  message: z.string().min(10)
})
```

Features:
- Dynamic form generation based on schema properties
- Field validation based on Zod rules
- Form submission with Firebase Storage integration

## Implementation Details

### Message Processing Pipeline

1. **Content Detection** - The server analyzes message content for URLs and special formats
2. **Media Processing** - Extracts metadata for detected media (video IDs, image URLs)
3. **HTML Generation** - Creates appropriate HTML markup for each media type
4. **Client-Side Interaction** - JavaScript handles user interactions with media elements

### CSS Architecture

- CSS variables for consistent styling
- Mobile-responsive design with breakpoints
- Grid-based layout for message alignment
- CSS animations for smooth transitions

## Getting Started

1. Install dependencies:
   ```
   npm install
   ```

2. Start the server:
   ```
   npm start
   ```

3. Open your browser to `http://localhost:3000`

## Testing Rich Media Features

Try sending these examples in the chat:

1. **YouTube Video**: `Check out this video: https://www.youtube.com/watch?v=dQw4w9WgXcQ`

2. **Multiple Images**: 
   ```
   Here are some nature photos:
   https://images.unsplash.com/photo-1506744038136-46273834b3fb
   https://images.unsplash.com/photo-1501854140801-50d01698950b
   https://images.unsplash.com/photo-1426604966848-d7adac402bff
   ```

3. **Zod Schema Form**:
   ```
   Please fill out this form:
   z.object({
     name: z.string().required(),
     email: z.string().email().required(),
     feedback: z.string().min(10).max(500)
   })
   ```