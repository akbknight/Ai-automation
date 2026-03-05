import { useState } from 'react';
import { FolderGit2, CheckCircle2, ShieldAlert, Sparkles, Loader2, Play } from 'lucide-react';

export default function Dashboard() {
    const [targetPath, setTargetPath] = useState('C:\\Users\\Akshay Kumar\\Downloads');
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ scanned: 0, organized: 0, categories: 0 });
    const [logs, setLogs] = useState([]);
    const [error, setError] = useState(null);

    const handleOrganize = async (e) => {
        e.preventDefault();
        if (!targetPath.trim()) return;

        setLoading(true);
        setError(null);
        setLogs([{ type: 'info', msg: `Initializing AI Organizer on: ${targetPath}` }]);

        try {
            const response = await fetch('http://localhost:8000/api/organize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target_dir: targetPath })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to organize files');
            }

            setStats({
                scanned: data.scanned,
                organized: data.organized,
                categories: data.categories
            });

            const newLogs = [];
            if (data.moved_log && data.moved_log.length > 0) {
                data.moved_log.forEach(item => {
                    newLogs.push({ type: 'success', msg: `Moved: ${item.file} → ${item.folder}` });
                });
            }

            if (data.failed_log && data.failed_log.length > 0) {
                data.failed_log.forEach(item => {
                    newLogs.push({ type: 'error', msg: `Failed [${item.file}]: ${item.reason}` });
                });
            }

            if (newLogs.length === 0) {
                newLogs.push({ type: 'info', msg: data.message || 'No files were moved.' });
            } else {
                newLogs.push({ type: 'info', msg: 'Organization complete.' });
            }

            setLogs(prev => [...prev, ...newLogs]);

        } catch (err) {
            setError(err.message);
            setLogs(prev => [...prev, { type: 'error', msg: err.message }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-5xl flex flex-col gap-6">

            {/* Header */}
            <div className="text-center mt-8 mb-4">
                <h1 className="text-4xl md:text-5xl font-bold brand-text mb-3 tracking-tight">Super Sonic AI File Organizer</h1>
                <p className="text-slate-200 text-lg md:text-xl font-light drop-shadow-md">Powered by Gemini 1.5 Flash</p>
            </div>

            {/* Main Control Card */}
            <div className="glass-card rounded-2xl p-6 md:p-8">
                <form onSubmit={handleOrganize} className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Target Directory Path</label>
                        <input
                            type="text"
                            value={targetPath}
                            onChange={(e) => setTargetPath(e.target.value)}
                            className="w-full bg-white/60 border border-slate-300 text-slate-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#137fec] focus:border-transparent transition-all"
                            placeholder="e.g. C:\Users\YourName\Downloads"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full md:w-auto bg-[#137fec] hover:bg-[#106ac5] text-white font-medium px-8 py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 h-[50px] disabled:opacity-70"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                        {loading ? 'Organizing...' : 'Organize Files'}
                    </button>
                </form>
                {error && <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-lg text-sm">{error}</div>}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 shadow-inner">
                        <FolderGit2 className="w-6 h-6" />
                    </div>
                    <p className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-1">Files Scanned</p>
                    <h3 className="text-4xl font-bold text-slate-800">{stats.scanned}</h3>
                </div>

                <div className="glass-card rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 shadow-inner">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <p className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-1">Files Organized</p>
                    <h3 className="text-4xl font-bold text-slate-800">{stats.organized}</h3>
                </div>

                <div className="glass-card rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-4 shadow-inner">
                        <FolderGit2 className="w-6 h-6" />
                    </div>
                    <p className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-1">Categories Created</p>
                    <h3 className="text-4xl font-bold text-slate-800">{stats.categories}</h3>
                </div>
            </div>

            {/* Activity Log */}
            <div className="glass-card rounded-2xl p-6 md:p-8 flex flex-col flex-1 min-h-[300px]">
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Play className="w-5 h-5 text-[#137fec]" />
                    Activity Log
                </h2>
                <div className="bg-slate-900 rounded-xl p-4 flex-1 overflow-y-auto custom-scrollbar shadow-inner max-h-[400px]">
                    {logs.length === 0 ? (
                        <div className="text-slate-500 text-sm font-mono h-full flex items-center justify-center">
                            Waiting for operations to start...
                        </div>
                    ) : (
                        <ul className="space-y-2 font-mono text-sm">
                            {logs.map((log, idx) => (
                                <li key={idx} className={`flex items-start gap-2 ${log.type === 'success' ? 'text-green-400' :
                                        log.type === 'error' ? 'text-red-400' : 'text-blue-300'
                                    }`}>
                                    <span className="text-slate-500 shrink-0">[{new Date().toLocaleTimeString()}]</span>
                                    <span className="break-all">{log.msg}</span>
                                </li>
                            ))}
                            {loading && (
                                <li className="text-yellow-400 flex items-center gap-2 animate-pulse mt-4">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    AI is categorizing your files...
                                </li>
                            )}
                        </ul>
                    )}
                </div>
            </div>

        </div>
    );
}
