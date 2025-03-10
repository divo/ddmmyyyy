# ddmmyyyy - Time Management Visualization

A Three.js-powered time management application that visualizes your life and daily schedule in an interactive 3D environment.

## Features

- **Life View**: A grid visualization of your entire life, with each square representing one week
- **Day View**: A detailed timeline of your daily schedule with color-coded blocks
- **Smooth Transitions**: Seamless zooming between Life and Day views
- **Real-time Updates**: The current time indicator updates in real-time
- **Markdown-based Templates**: Define your day schedule using simple markdown format

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/ddmmyyyy.git
cd ddmmyyyy
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## Usage

### Life View

The Life View displays a grid of squares, each representing one week of your life:
- White squares: Past weeks
- Blue square: Current week
- Light gray squares: Future weeks

Click on the current week (blue square) to zoom into the Day View.

### Day View

The Day View shows your daily schedule as a timeline of blocks:
- Each block represents a scheduled activity
- The red line indicates the current time
- Click the "Back to Life View" button to return to the Life View

### Customizing Your Schedule

The daily schedule is defined using a simple markdown format:

```markdown
# Activity Title
start_time - end_time

# Another Activity
start_time - end_time
```

For example:
```markdown
# Morning Routine
06:00 - 09:00

# Work Session
09:00 - 12:00
```

## Technologies Used

- [Three.js](https://threejs.org/) - 3D graphics library
- [Vite](https://vitejs.dev/) - Next generation frontend tooling

## Future Enhancements

- Editable day templates
- Custom color themes
- Data persistence
- Multiple day templates
- Mobile support
- Advanced 3D effects and animations

## License

This project is licensed under the MIT License - see the LICENSE file for details. 