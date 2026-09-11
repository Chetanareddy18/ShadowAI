import { ThemeProvider } from "./contexts/ThemeContext";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Stats from "./components/Stats";
import Features from "./components/Features";
import Pipeline from "./components/Pipeline";
import HowItWorks from "./components/HowItWorks";
import CTA from "./components/CTA";

export default function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen overflow-x-hidden t-bg t-text">
        <Navbar />
        <Hero />
        <Stats />
        <Features />
        <Pipeline />
        <HowItWorks />
        <CTA />
      </div>
    </ThemeProvider>
  );
}
