import React, { useState, useEffect } from 'react';

export default function MushroomLandingPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    setIsVisible(true);
  }, []);

  const mushrooms = [
    {
      name: "Lion's Mane",
      icon: "🦁",
      benefit: "Cognitive Enhancement",
      description: "Enhance mental clarity and focus with nanoemulsified Lion's Mane. Our process achieves sub-30nm particle sizes, delivering nootropic benefits with near-instant absorption.",
      color: "from-teal-500 to-emerald-600",
      stats: { particle: "< 25nm", onset: "5-10 min", bioavail: "10x" }
    },
    {
      name: "Reishi",
      icon: "🍄",
      benefit: "Stress & Immunity",
      description: "Transform adaptogenic Reishi into ultra-fine nanoemulsions. Perfect for functional beverages targeting relaxation and immune support with rapid onset effects.",
      color: "from-blue-500 to-cyan-600",
      stats: { particle: "< 30nm", onset: "8-12 min", bioavail: "8x" }
    },
    {
      name: "Chaga",
      icon: "🌑",
      benefit: "Antioxidant Power",
      description: "Unlock Chaga's full antioxidant potential with ultrasonic nanoemulsification. Create crystal-clear, translucent beverages with maximum therapeutic impact.",
      color: "from-emerald-500 to-teal-600",
      stats: { particle: "< 28nm", onset: "5-10 min", bioavail: "12x" }
    }
  ];

  const features = [
    { icon: "⚡", title: "Near-Instant Onset", desc: "Effects in 5-10 minutes vs 60-90 with traditional extracts" },
    { icon: "💧", title: "Translucent Clarity", desc: "Sub-30nm particles create nearly invisible emulsions in any beverage" },
    { icon: "🎯", title: "Precise Dosing", desc: "Ultra-consistent particle size ensures reliable potency every batch" },
    { icon: "📈", title: "10x Bioavailability", desc: "Nano-sized particles pass directly through cellular membranes" },
    { icon: "🧪", title: "Clean Label", desc: "Food-grade surfactants, no synthetic additives required" },
    { icon: "🏭", title: "Scale Ready", desc: "From R&D to 20L/hr production with the same equipment" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-lg flex items-center justify-center font-bold text-slate-900">CT</div>
          <span className="font-semibold text-lg">Cannasol Technologies</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-slate-300">
          <a href="#benefits" className="hover:text-white transition">Benefits</a>
          <a href="#technology" className="hover:text-white transition">Technology</a>
          <a href="#mushrooms" className="hover:text-white transition">Mushrooms</a>
          <button className="px-5 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-900 font-semibold rounded-full hover:shadow-lg hover:shadow-teal-500/25 transition-all">
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className={`relative z-10 max-w-7xl mx-auto px-8 pt-16 pb-24 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full text-sm text-slate-300 mb-8 border border-slate-700/50">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
            Now serving the functional mushroom industry
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-teal-300 via-emerald-300 to-teal-300 bg-clip-text text-transparent">
              Nano-Enhanced
            </span>
            <br />
            <span className="text-white">Mushroom Extracts</span>
          </h1>
          
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Transform Lion's Mane, Reishi & Chaga into translucent, fast-acting nanoemulsions with 
            <span className="text-white"> sub-30nm particle sizes</span> and 
            <span className="text-white"> 10x better bioavailability.</span>
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="group px-8 py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-900 font-bold rounded-full text-lg hover:shadow-xl hover:shadow-teal-500/30 transition-all hover:scale-105">
              Request a Demo
              <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
            </button>
            <button className="px-8 py-4 bg-slate-800/50 text-white font-semibold rounded-full text-lg border border-slate-700 hover:bg-slate-800 transition-all">
              Watch Process Video
            </button>
          </div>
        </div>

        {/* Floating mushroom icons */}
        <div className="absolute top-20 left-10 text-6xl opacity-20 animate-bounce" style={{animationDuration: '3s'}}>🍄</div>
        <div className="absolute top-40 right-16 text-5xl opacity-20 animate-bounce" style={{animationDuration: '4s', animationDelay: '1s'}}>🦁</div>
        <div className="absolute bottom-20 left-20 text-4xl opacity-20 animate-bounce" style={{animationDuration: '3.5s', animationDelay: '0.5s'}}>✨</div>
      </header>

      {/* Stats Bar */}
      <section className="relative z-10 border-y border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-8 py-8 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: "< 30nm", label: "Particle Size" },
            { value: "5-10 min", label: "Onset Time" },
            { value: "10x", label: "Bioavailability" },
            { value: "20L/hr", label: "Production Rate" }
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">{stat.value}</div>
              <div className="text-slate-500 text-sm mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section id="benefits" className="relative z-10 max-w-7xl mx-auto px-8 py-24">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Mushroom Extracts Have a 
              <span className="text-teal-400"> Bioavailability Problem</span>
            </h2>
            <p className="text-slate-400 text-lg mb-6 leading-relaxed">
              Traditional mushroom extracts are hydrophobic—they don't dissolve in water. This means poor absorption, inconsistent effects, and cloudy beverages that consumers reject.
            </p>
            <div className="space-y-4">
              {[
                "Only 10-15% of active compounds absorbed",
                "60-90 minute onset delays consumer experience",
                "Separation and sedimentation in beverages",
                "Bitter taste from unprocessed extracts"
              ].map((problem, i) => (
                <div key={i} className="flex items-center gap-3 text-slate-300">
                  <span className="text-red-400">✕</span>
                  {problem}
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-3xl p-8 border border-slate-700/50">
            <div className="text-emerald-400 font-semibold mb-4 text-sm tracking-wider">THE SOLUTION</div>
            <h3 className="text-2xl font-bold mb-4">Ultrasonic Nanoemulsification</h3>
            <p className="text-slate-400 mb-6">
              Our CT-2000 system uses 20kHz ultrasonic cavitation to break down mushroom extracts into sub-30nm droplets that absorb near-instantly and stay suspended indefinitely.
            </p>
            <div className="space-y-4">
              {[
                "80-90% absorption rate",
                "Effects felt in 5-10 minutes",
                "Translucent, permanently stable emulsions",
                "Clean, neutral taste profile"
              ].map((benefit, i) => (
                <div key={i} className="flex items-center gap-3 text-white">
                  <span className="text-emerald-400">✓</span>
                  {benefit}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Mushroom Tabs Section */}
      <section id="mushrooms" className="relative z-10 max-w-7xl mx-auto px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Three Powerhouse Mushrooms,<br /><span className="text-teal-400">One Proven Process</span></h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Our ultrasonic technology works with all major functional mushroom extracts. Click to explore each application.
          </p>
        </div>

        {/* Tab buttons */}
        <div className="flex justify-center gap-4 mb-12 flex-wrap">
          {mushrooms.map((m, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`px-6 py-3 rounded-full font-semibold transition-all ${
                activeTab === i 
                  ? `bg-gradient-to-r ${m.color} text-white shadow-lg` 
                  : 'bg-slate-800/50 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              {m.icon} {m.name}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 rounded-3xl p-8 md:p-12 border border-slate-700/50">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className={`inline-block px-4 py-1 rounded-full text-sm font-semibold mb-4 bg-gradient-to-r ${mushrooms[activeTab].color}`}>
                {mushrooms[activeTab].benefit}
              </div>
              <h3 className="text-3xl font-bold mb-4">{mushrooms[activeTab].icon} {mushrooms[activeTab].name} Nanoemulsion</h3>
              <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                {mushrooms[activeTab].description}
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-teal-400">{mushrooms[activeTab].stats.particle}</div>
                  <div className="text-xs text-slate-500 mt-1">Particle Size</div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-teal-400">{mushrooms[activeTab].stats.onset}</div>
                  <div className="text-xs text-slate-500 mt-1">Onset Time</div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-teal-400">{mushrooms[activeTab].stats.bioavail}</div>
                  <div className="text-xs text-slate-500 mt-1">Bioavailability</div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className={`w-64 h-64 mx-auto rounded-full bg-gradient-to-br ${mushrooms[activeTab].color} opacity-20 blur-3xl absolute inset-0 m-auto`}></div>
              <div className="relative text-center">
                <div className="text-9xl mb-4">{mushrooms[activeTab].icon}</div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/80 rounded-full text-sm">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                  Ready for production
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="technology" className="relative z-10 max-w-7xl mx-auto px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Brands Choose <span className="text-teal-400">Cannasol</span></h2>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="group bg-slate-800/30 rounded-2xl p-6 border border-slate-700/50 hover:border-teal-500/50 transition-all hover:-translate-y-1">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-xl font-bold mb-2">{f.title}</h3>
              <p className="text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 max-w-4xl mx-auto px-8 py-24">
        <div className="bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-teal-500/10 rounded-3xl p-12 text-center border border-teal-500/20">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Nano-Enhance Your Mushroom Products?</h2>
          <p className="text-slate-400 text-lg mb-8 max-w-2xl mx-auto">
            Schedule a demo to see our CT-2000 system create translucent Lion's Mane, Reishi, or Chaga nanoemulsions with sub-30nm particle sizes in real-time.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-900 font-bold rounded-full text-lg hover:shadow-xl hover:shadow-teal-500/30 transition-all">
              Schedule Demo Call
            </button>
            <button className="px-8 py-4 bg-transparent text-white font-semibold rounded-full text-lg border border-slate-600 hover:border-teal-500 transition-all">
              Download Spec Sheet
            </button>
          </div>
          <p className="text-slate-500 text-sm mt-6">
            📞 (216) 921-2240 · Sarasota, FL
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-lg flex items-center justify-center font-bold text-slate-900 text-sm">CT</div>
            <span className="text-slate-400">© 2025 Cannasol Technologies LLC</span>
          </div>
          <div className="flex gap-6 text-sm text-slate-500">
            <a href="#" className="hover:text-white transition">Equipment</a>
            <a href="#" className="hover:text-white transition">Surfactants</a>
            <a href="#" className="hover:text-white transition">Resources</a>
            <a href="#" className="hover:text-white transition">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}