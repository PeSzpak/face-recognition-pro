import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import RecognitionPanel from './components/RecognitionPanel';
import ImageUpload from './components/ImageUpload';
import PersonCard from './components/PersonCard';
import WebcamCapture from './components/WebcamCapture';
import './styles/globals.css';

const App: React.FC = () => {
  return (
    <Router>
      <div className="App">
        <Switch>
          <Route path="/" exact component={Dashboard} />
          <Route path="/recognition" component={RecognitionPanel} />
          <Route path="/upload" component={ImageUpload} />
          <Route path="/person/:id" component={PersonCard} />
          <Route path="/webcam" component={WebcamCapture} />
        </Switch>
      </div>
    </Router>
  );
};

export default App;