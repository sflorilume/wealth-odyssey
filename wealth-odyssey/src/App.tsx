import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, BarChart2, Calendar, Percent, Target, Award, Star, RefreshCw } from 'lucide-react';

// --- Configuration & Helpers ---

const USD_TO_IDR_RATE = 16348; // Approximate conversion rate in July 2025

// Formats a number for display in cards, charts, etc.
const formatCurrency = (value, currency) => {
    if (currency === 'IDR') {
        const idrValue = value * USD_TO_IDR_RATE;
        if (idrValue >= 1e12) { // Trillions
            return `Rp ${(idrValue / 1e12).toFixed(2)} T`;
        }
        if (idrValue >= 1e9) { // Billions (Miliar)
            return `Rp ${(idrValue / 1e9).toFixed(2)} M`;
        }
        if (idrValue >= 1e6) { // Millions (Juta)
            return `Rp ${(idrValue / 1e6).toFixed(1)} Jt`;
        }
        if (idrValue >= 1e3) { // Thousands (Ribu)
            return `Rp ${Math.round(idrValue / 1e3)} rb`;
        }
        return `Rp ${Math.round(idrValue).toLocaleString('id-ID')}`;
    }
    
    // Default to USD formatting
    if (value >= 1e6) {
        return `$${(value / 1e6).toFixed(2)}M`;
    }
    if (value >= 1e3) {
        return `$${(value / 1e3).toFixed(1)}k`;
    }
    return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
};

// Main calculation engine (always works in USD)
const calculateWealthJourney = (inputs) => {
    const { startingAmount, monthlySavings, annualRoi, years, yearlyExpense } = inputs; // These are in USD
    const monthlyRoi = annualRoi / 100 / 12;
    const totalMonths = years * 12;
    
    let currentBalance = startingAmount;
    const data = [];
    const milestones = {
        '100k': null,
        '250k': null,
        '500k': null,
        '1M': null,
    };

    for (let month = 1; month <= totalMonths; month++) {
        currentBalance += monthlySavings;
        currentBalance *= (1 + monthlyRoi);
        
        const year = Math.floor(month / 12);
        
        data.push({
            year: year + (month % 12) / 12,
            month,
            name: `Year ${Math.ceil((month)/12)}`,
            value: currentBalance, // Stored as USD
        });

        // Check milestones (in USD)
        if (currentBalance >= 100000 && !milestones['100k']) milestones['100k'] = month / 12;
        if (currentBalance >= 250000 && !milestones['250k']) milestones['250k'] = month / 12;
        if (currentBalance >= 500000 && !milestones['500k']) milestones['500k'] = month / 12;
        if (currentBalance >= 1000000 && !milestones['1M']) milestones['1M'] = month / 12;
    }

    const fireTarget = yearlyExpense * 25;
    const fireYear = data.find(d => d.value >= fireTarget)?.year || null;
    
    const totalInvested = startingAmount + (monthlySavings * totalMonths);
    const finalValue = data[data.length - 1]?.value || 0;
    const totalReturns = finalValue - totalInvested;

    return { data, milestones, fireTarget, fireYear, totalInvested, totalReturns, finalValue };
};

// --- UI Components ---

const CurrencySwitcher = ({ currency, setCurrency }) => (
    <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-gray-300">Currency:</span>
        <div className="flex rounded-lg bg-gray-700 p-1">
            <button onClick={() => setCurrency('USD')} className={`px-3 py-1 text-sm font-semibold rounded-md transition ${currency === 'USD' ? 'bg-cyan-500 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>
                USD
            </button>
            <button onClick={() => setCurrency('IDR')} className={`px-3 py-1 text-sm font-semibold rounded-md transition ${currency === 'IDR' ? 'bg-cyan-500 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>
                IDR
            </button>
        </div>
    </div>
);

// UPDATED InputCard component with number formatting
const InputCard = ({ icon, label, value, onChange, placeholder, currency }) => {
    // Format the value for display with separators
    const displayValue = currency === 'IDR'
        ? Math.round(value * USD_TO_IDR_RATE).toLocaleString('id-ID')
        : value.toLocaleString('en-US');

    const currencySymbol = currency === 'IDR' ? 'Rp' : '$';

    const handleChange = (e) => {
        // Remove all non-digit characters to get the raw number string
        const numberString = e.target.value.replace(/\D/g, '');
        const rawValue = parseFloat(numberString) || 0;
        
        // Convert back to USD to store in state
        const valueInUSD = currency === 'IDR' ? rawValue / USD_TO_IDR_RATE : rawValue;
        onChange(valueInUSD);
    };

    return (
        <div className="w-full">
            <label className="flex items-center text-sm font-medium text-gray-300 mb-2">
                {icon}
                <span className="ml-2">{label}</span>
            </label>
            <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">{currencySymbol}</span>
                <input
                    type="text" // Use type="text" to allow for formatted strings
                    inputMode="numeric" // Helps mobile users get a numeric keyboard
                    value={displayValue}
                    onChange={handleChange}
                    placeholder={placeholder}
                    className="w-full pl-8 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
                />
            </div>
        </div>
    );
};

const SliderInput = ({ icon, label, value, onChange, min, max, step, unit }) => (
    <div className="w-full">
        <label className="flex items-center text-sm font-medium text-gray-300 mb-2">
            {icon}
            <span className="ml-2">{label}: <span className="font-bold text-cyan-400">{value}{unit}</span></span>
        </label>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={e => onChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            style={{ '--thumb-color': '#22d3ee' }}
        />
    </div>
);

const StatCard = ({ title, value, icon, currency }) => (
    <div className="bg-gray-800 p-4 rounded-lg flex items-start">
        <div className="p-2 bg-gray-700 rounded-md mr-4">
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-400">{title}</p>
            <p className="text-xl font-bold text-white">{formatCurrency(value, currency)}</p>
        </div>
    </div>
);

const Badge = ({ name, unlocked, icon }) => (
    <div className={`text-center p-4 rounded-lg transition-all duration-300 ${unlocked ? 'bg-yellow-500/20 border-yellow-500' : 'bg-gray-800 border-gray-700'} border`}>
        <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${unlocked ? 'bg-yellow-500' : 'bg-gray-700'}`}>
            {React.cloneElement(icon, { size: 32, color: unlocked ? 'black' : 'gray' })}
        </div>
        <p className={`mt-2 font-semibold ${unlocked ? 'text-yellow-400' : 'text-gray-500'}`}>{name}</p>
    </div>
);


// --- Main App Component ---

export default function App() {
    // --- State Management from localStorage ---
    const [inputs, setInputs] = useState(() => {
        try {
            const saved = localStorage.getItem('wealthOdysseyInputs');
            return saved ? JSON.parse(saved) : { startingAmount: 1000, monthlySavings: 500, annualRoi: 8, years: 30, yearlyExpense: 40000 };
        } catch (error) {
            return { startingAmount: 1000, monthlySavings: 500, annualRoi: 8, years: 30, yearlyExpense: 40000 };
        }
    });
    
    const [gamification, setGamification] = useState(() => {
        try {
            const saved = localStorage.getItem('wealthOdysseyGamification');
            return saved ? JSON.parse(saved) : { xp: 0, level: 1 };
        } catch (error) {
            return { xp: 0, level: 1 };
        }
    });
    
    const [currency, setCurrency] = useState(() => {
        return localStorage.getItem('wealthOdysseyCurrency') || 'USD';
    });

    const [results, setResults] = useState(null);
    
    // --- Handlers ---
    const handleInputChange = (field, value) => {
        setInputs(prev => ({ ...prev, [field]: value }));
    };

    const runSimulation = () => {
        const simResults = calculateWealthJourney(inputs);
        setResults(simResults);
        // Only update gamification when simulation is explicitly run
        setGamification(prev => ({
            ...prev,
            xp: prev.xp + 100
        }));
    };
    
    // --- Effects ---
    // Run simulation on initial load
    useEffect(() => {
        const simResults = calculateWealthJourney(inputs);
        setResults(simResults);
    }, []);

    // Save state to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('wealthOdysseyInputs', JSON.stringify(inputs));
    }, [inputs]);

    useEffect(() => {
        localStorage.setItem('wealthOdysseyGamification', JSON.stringify(gamification));
    }, [gamification]);
    
    useEffect(() => {
        localStorage.setItem('wealthOdysseyCurrency', currency);
    }, [currency]);

    // Effect for level up logic
    useEffect(() => {
        if (gamification.xp >= gamification.level * 500) {
            setGamification(prev => ({ ...prev, level: prev.level + 1 }));
        }
    }, [gamification.xp]);

    // --- Render ---
    return (
        <div className="bg-gray-900 min-h-screen text-white font-sans p-4 sm:p-6 lg:p-8">
            <style>{`
                input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 20px; height: 20px; background: var(--thumb-color, #22d3ee); cursor: pointer; border-radius: 50%; border: 2px solid #1a202c; }
                input[type=range]::-moz-range-thumb { width: 20px; height: 20px; background: var(--thumb-color, #22d3ee); cursor: pointer; border-radius: 50%; border: 2px solid #1a202c; }
            `}</style>
            <div className="max-w-7xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                        Wealth Odyssey
                    </h1>
                    <p className="text-gray-400 mt-2 text-lg">Your Gamified Journey to Financial Freedom</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-8">
                        <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-semibold flex items-center"><BarChart2 className="mr-3 text-cyan-400"/>Controls</h2>
                                <CurrencySwitcher currency={currency} setCurrency={setCurrency} />
                            </div>
                            <div className="space-y-6">
                                <InputCard icon={<DollarSign size={16} />} label="Starting Savings" value={inputs.startingAmount} onChange={v => handleInputChange('startingAmount', v)} placeholder="1000" currency={currency} />
                                <InputCard icon={<DollarSign size={16} />} label="Monthly Savings" value={inputs.monthlySavings} onChange={v => handleInputChange('monthlySavings', v)} placeholder="500" currency={currency} />
                                <InputCard icon={<DollarSign size={16} />} label="Target Yearly Spending" value={inputs.yearlyExpense} onChange={v => handleInputChange('yearlyExpense', v)} placeholder="40000" currency={currency} />
                                <SliderInput icon={<Percent size={16} />} label="Expected Annual ROI" value={inputs.annualRoi} onChange={v => handleInputChange('annualRoi', v)} min={1} max={15} step={0.5} unit="%" />
                                <SliderInput icon={<Calendar size={16} />} label="Years to Simulate" value={inputs.years} onChange={v => handleInputChange('years', v)} min={5} max={50} step={1} unit=" years" />
                            </div>
                             <button 
                                onClick={runSimulation}
                                className="w-full mt-8 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 flex items-center justify-center"
                            >
                                <RefreshCw className="mr-2 h-5 w-5"/>
                                Recalculate Journey
                            </button>
                        </div>

                        <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                            <h2 className="text-2xl font-semibold mb-6 flex items-center"><Star className="mr-3 text-yellow-400"/>Gamification</h2>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-gray-300">Level: <span className="font-bold text-xl text-yellow-400">{gamification.level}</span></p>
                                    <div className="w-full bg-gray-700 rounded-full h-2.5 mt-1">
                                        <div className="bg-yellow-400 h-2.5 rounded-full" style={{ width: `${(gamification.xp % 500) / 5}%` }}></div>
                                    </div>
                                    <p className="text-xs text-gray-500 text-right">{gamification.xp % 500} / 500 XP to next level</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-4">
                                     <Badge name="First $100k" unlocked={results?.milestones['100k']} icon={<Award />} />
                                     <Badge name="Investor Rookie" unlocked={gamification.xp > 0} icon={<Award />} />
                                     <Badge name="Compound Master" unlocked={inputs.annualRoi >= 10} icon={<Award />} />
                                     <Badge name="Millionaire" unlocked={results?.milestones['1M']} icon={<Award />} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <StatCard title="Projected Final Value" value={results ? results.finalValue : 0} icon={<DollarSign className="text-green-400"/>} currency={currency} />
                            <StatCard title="FIRE Target (4% Rule)" value={results ? results.fireTarget : 0} icon={<Target className="text-red-400"/>} currency={currency} />
                            <StatCard title="Years to FIRE" value={results?.fireYear ? `${results.fireYear.toFixed(1)} years` : 'N/A'} icon={<Calendar className="text-cyan-400"/>} currency={currency} />
                        </div>

                        <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 h-[400px]">
                            <h3 className="text-xl font-semibold mb-4">Wealth Projection</h3>
                            {results && (
                                <ResponsiveContainer width="100%" height="90%">
                                    <LineChart data={results.data} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                                        <XAxis dataKey="name" stroke="#A0AEC0" />
                                        <YAxis stroke="#A0AEC0" tickFormatter={(value) => formatCurrency(value, currency)} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568' }}
                                            labelStyle={{ color: '#E2E8F0' }}
                                            formatter={(value) => [formatCurrency(value, currency), 'Net Worth']}
                                        />
                                        <Legend wrapperStyle={{ color: '#E2E8F0' }}/>
                                        <Line type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={2} dot={false} name="Projected Wealth" />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                        
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                                <h3 className="text-xl font-semibold mb-4">Milestones</h3>
                                <ul className="space-y-2 text-gray-300">
                                    {results && Object.entries(results.milestones).map(([key, value]) => (
                                        <li key={key} className="flex justify-between">
                                            <span>{key === '1M' ? 'Reach $1 Million' : `Reach $${parseInt(key).toLocaleString()}k`}</span>
                                            <span className={`font-bold ${value ? 'text-green-400' : 'text-gray-500'}`}>{value ? `${value.toFixed(1)} years` : 'Pending...'}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                             <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                                <h3 className="text-xl font-semibold mb-4">Investment Breakdown</h3>
                                {results && (
                                    <ul className="space-y-2 text-gray-300">
                                        <li className="flex justify-between"><span>Total Invested</span> <span className="font-bold">{formatCurrency(results.totalInvested, currency)}</span></li>
                                        <li className="flex justify-between"><span>Total Returns</span> <span className="font-bold text-green-400">{formatCurrency(results.totalReturns, currency)}</span></li>
                                        <li className="flex justify-between border-t border-gray-700 mt-2 pt-2"><span>Final Value</span> <span className="font-bold text-cyan-400">{formatCurrency(results.finalValue, currency)}</span></li>
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
