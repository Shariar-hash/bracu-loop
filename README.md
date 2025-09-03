# 🎓 BRACU Loop - Academic Resource Platform

A comprehensive web application for BRAC University students to review faculty members, access previous question papers, share notes, and find resources - all in one place.

## ✨ Features

### 👨‍🏫 Faculty Review System
- **Detailed Faculty Reviews**: Students can write comprehensive reviews about their faculty members
- **Interactive Star Rating**: Clickable 5-star rating system with visual feedback
- **Course-Specific Reviews**: Reviews can be associated with specific courses
- **Reply System**: Threaded discussions with reply functionality
- **Voting System**: Upvote/downvote reviews and replies
- **Review Management**: Edit, delete, and report functionality

### 📚 Academic Resources
- **Previous Questions**: Access and share previous exam papers, quizzes, and assignments organized by course
- **Course-Based Organization**: Resources organized in course boxes for easy navigation
- **File Upload System**: Students can contribute by uploading academic materials
- **Notes Sharing**: Share and access study notes (coming soon)
- **Room Finder**: Find available rooms and study spaces (coming soon)

### 🔧 Technical Features
- **Real-time Updates**: Live updates using Supabase real-time subscriptions
- **Google Authentication**: Secure login with Google OAuth
- **Responsive Design**: Mobile-first design with dark/light mode support
- **Security**: Comprehensive security measures with API key protection

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Authentication**: Google OAuth via Supabase Auth
- **Icons**: Lucide React
- **State Management**: React Context API

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or bun package manager
- Supabase account
- Google Cloud Console project (for OAuth)

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Shariar-hash/bracu-loop.git
   cd bracu-loop
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Environment Setup** 🔒
   - Copy `.env.example` to `.env`
   - **⚠️ IMPORTANT**: Never commit your `.env` file to git
   - Fill in your configuration values:
   ```bash
   cp .env.example .env
   ```

4. **Configure Environment Variables**
   Edit `.env` with your actual values:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
   ```

5. **Database Setup**
   - Create a new Supabase project
   - Run the database migrations (SQL scripts provided in the repository)
   - Set up Row Level Security (RLS) policies
   - Configure Google OAuth in Supabase Auth settings

6. **Start Development Server**
   ```bash
   npm run dev
   # or
   bun dev
   ```

## � Security

This project implements comprehensive security measures:

- **Environment Variable Protection**: All sensitive data is stored in environment variables
- **API Key Security**: Supabase keys are never committed to the repository
- **Git Security**: Enhanced `.gitignore` prevents accidental commits of sensitive files
- **Documentation**: See `SECURITY.md` for detailed security guidelines

**🚨 Security Checklist:**
- ✅ `.env` file excluded from git
- ✅ Enhanced `.gitignore` for API key protection
- ✅ Security documentation provided
- ✅ Environment variable template available

## �🗄️ Database Schema

The application uses the following main tables:
- `faculty_reviews` - Store faculty reviews and ratings
- `courses` - Course information
- `question_papers` - Academic resources and previous papers
- `course_categories` - Course categorization
- `votes` - Voting system for reviews
- `profiles` - User profile data

## 🔐 Authentication

The app uses Google OAuth through Supabase Auth. Users must sign in with their Google account to:
- Write reviews
- Upload academic resources
- Vote on content
- Reply to reviews
- Edit/delete their own content

## 🎨 UI Components

Built with modern, accessible components:
- Interactive star rating system
- Responsive card layouts
- Dark/light mode toggle
- Smooth animations and transitions
- Mobile-optimized interface

## 📱 Responsive Design

- **Mobile First**: Optimized for mobile devices
- **Tablet Support**: Enhanced layout for tablets
- **Desktop**: Full-featured desktop experience
- **Dark Mode**: Complete dark theme support

## 🚀 Deployment

The application can be deployed on any static hosting platform:

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Deploy the `dist` folder** to your hosting platform of choice:
   - Vercel
   - Netlify
   - GitHub Pages
   - AWS S3 + CloudFront

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- BRAC University community
- Supabase team for the excellent backend platform
- shadcn/ui for the beautiful component library
- All contributors and beta testers

## 📞 Support

For support, email [support email] or create an issue in this repository.

---

Made with ❤️ for the BRAC University community
