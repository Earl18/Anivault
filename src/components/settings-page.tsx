'use client';

import { useState } from 'react';
import {
  User,
  Settings,
  RefreshCw,
  Shield,
  ChevronRight,
  Eye,
  EyeOff,
  Download,
  Upload,
  ExternalLink,
  LogOut,
  Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Sidebar tab definitions ── */
const tabs = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'preferences', label: 'Preferences', icon: Settings },
  { id: 'sync', label: 'Sync', icon: RefreshCw },
  { id: 'security', label: 'Security', icon: Shield },
] as const;

type TabId = (typeof tabs)[number]['id'];

/* ── Toggle Switch ── */
function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white/90">{label}</p>
        {description && <p className="text-xs text-white/40 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-300 ${
          checked ? 'bg-primary' : 'bg-white/10'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

/* ── Select Dropdown ── */
function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
}) {
  return (
    <div className="py-3">
      <label className="text-sm font-medium text-white/90 block mb-2">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none transition-colors focus:border-primary/50 focus:bg-white/[0.08]"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#050505]">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ── Input Field ── */
function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  hint,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  type?: string;
  hint?: string;
  maxLength?: number;
}) {
  return (
    <div className="py-3">
      <label className="text-sm font-medium text-white/90 block mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 placeholder-white/20 outline-none transition-colors focus:border-primary/50 focus:bg-white/[0.08]"
      />
      {hint && <p className="text-xs text-white/30 mt-1">{hint}</p>}
    </div>
  );
}

/* ── Textarea Field ── */
function TextareaField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  hint?: string;
  maxLength?: number;
}) {
  return (
    <div className="py-3">
      <label className="text-sm font-medium text-white/90 block mb-2">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={3}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 placeholder-white/20 outline-none transition-colors focus:border-primary/50 focus:bg-white/[0.08] resize-none"
      />
      <div className="flex justify-between mt-1">
        {hint && <p className="text-xs text-white/30">{hint}</p>}
        {maxLength && (
          <p className="text-xs text-white/30 ml-auto">
            {value.length}/{maxLength}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Section Divider ── */
function SectionDivider() {
  return <div className="h-px bg-white/[0.06] my-2" />;
}

/* ── Account Tab Content ── */
function AccountTab() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');

  return (
    <div className="space-y-6">
      {/* Account Info */}
      <div>
        <h3 className="text-lg font-semibold text-white/90 mb-4">Account Info</h3>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/40">User ID</span>
            <span className="text-sm text-white/60 font-mono">---</span>
          </div>
          <SectionDivider />
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/40">Email</span>
            <span className="text-sm text-white/60">guest@anivault.local</span>
          </div>
          <SectionDivider />
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/40">Status</span>
            <span className="inline-flex items-center gap-1.5 text-xs text-yellow-400">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
              Unverified
            </span>
          </div>
        </div>
      </div>

      {/* Sign in required */}
      <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.01] p-4 text-center">
        <p className="text-sm text-white/50 mb-3">Sign in required</p>
        <p className="text-xs text-white/30 mb-4">
          Please connect your account to edit your profile.
        </p>
        <button className="px-4 py-2 rounded-lg bg-primary text-black font-semibold text-sm hover:bg-primary/90 transition-colors">
          Sign In
        </button>
      </div>

      {/* Local Profile */}
      <div>
        <h3 className="text-lg font-semibold text-white/90 mb-4">Local Profile</h3>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
              <User className="w-6 h-6 text-white/30" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/80">Guest Profile</p>
              <p className="text-xs text-white/30">
                Joined May 22, 2026 · just now
              </p>
            </div>
          </div>
          <button className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 transition-colors mt-2">
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Profile Form */}
      <div>
        <InputField
          label="Username"
          value={username}
          onChange={setUsername}
          placeholder="Enter username"
          hint="3-10 characters, letters and numbers only."
        />
        <InputField
          label="Display Name"
          value={displayName}
          onChange={setDisplayName}
          placeholder="Enter display name"
          hint="How others see your name."
        />
        <TextareaField
          label="Bio"
          value={bio}
          onChange={setBio}
          placeholder="Tell others a bit about you."
          maxLength={500}
        />
        <InputField
          label="Website"
          value={website}
          onChange={setWebsite}
          placeholder="https://example.com"
        />
        <button className="w-full mt-4 px-4 py-2.5 rounded-lg bg-primary text-black font-semibold text-sm hover:bg-primary/90 transition-colors">
          Save Changes
        </button>
      </div>
    </div>
  );
}

/* ── Preferences Tab Content ── */
function PreferencesTab() {
  const [disableAds, setDisableAds] = useState(false);
  const [preferDub, setPreferDub] = useState(false);
  const [skipIntro, setSkipIntro] = useState(false);
  const [skipOutro, setSkipOutro] = useState(false);
  const [autoNext, setAutoNext] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [pushNotifs, setPushNotifs] = useState(false);
  const [showComments, setShowComments] = useState(true);
  const [publicWatchlist, setPublicWatchlist] = useState(true);
  const [langPref, setLangPref] = useState('all');
  const [episodeNotifs, setEpisodeNotifs] = useState('all');

  return (
    <div className="space-y-6">
      {/* Toggle Settings */}
      <div>
        <h3 className="text-lg font-semibold text-white/90 mb-2">Playback & Display</h3>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4">
          <ToggleSwitch
            checked={disableAds}
            onChange={setDisableAds}
            label="Disable Ads"
            description="We only show up to 3 ads per day on the home page to keep the site running."
          />
          <SectionDivider />
          <ToggleSwitch
            checked={preferDub}
            onChange={setPreferDub}
            label="Default to Dubbed"
            description="When available, prefer dubbed audio over subbed."
          />
          <SectionDivider />
          <ToggleSwitch
            checked={skipIntro}
            onChange={setSkipIntro}
            label="Skip intro automatically"
            description="Automatically skip intro sequences when detected."
          />
          <SectionDivider />
          <ToggleSwitch
            checked={skipOutro}
            onChange={setSkipOutro}
            label="Skip outro automatically"
            description="Automatically skip outro/ending sequences when detected."
          />
          <SectionDivider />
          <ToggleSwitch
            checked={autoNext}
            onChange={setAutoNext}
            label="Auto next episode"
            description="Automatically play the next episode when the current one finishes."
          />
          <SectionDivider />
          <ToggleSwitch
            checked={autoPlay}
            onChange={setAutoPlay}
            label="Auto play"
            description="Automatically start playing when you navigate to a watch page."
          />
        </div>
      </div>

      {/* Notification Settings */}
      <div>
        <h3 className="text-lg font-semibold text-white/90 mb-2">Notifications & Privacy</h3>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4">
          <ToggleSwitch
            checked={pushNotifs}
            onChange={setPushNotifs}
            label="Browser Notifications"
            description="Receive alerts when new episodes air or any community activities happen."
          />
          <SectionDivider />
          <ToggleSwitch
            checked={showComments}
            onChange={setShowComments}
            label="Show comments"
            description="Display the comments section on the watch page."
          />
          <SectionDivider />
          <ToggleSwitch
            checked={publicWatchlist}
            onChange={setPublicWatchlist}
            label="Public watchlist"
            description="Allow others to view your watchlist when visiting your profile."
          />
        </div>
      </div>

      {/* Episode Notifications */}
      <div>
        <h3 className="text-lg font-semibold text-white/90 mb-2">Episode Notifications</h3>
        <p className="text-xs text-white/40 mb-3">
          Choose which episode releases and watchlist statuses trigger notifications for you.
        </p>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <SelectField
            label="Notify me about"
            value={episodeNotifs}
            onChange={setEpisodeNotifs}
            options={[
              { value: 'all', label: 'All episodes' },
              { value: 'watching', label: 'Watching only' },
              { value: 'planning', label: 'Planning only' },
              { value: 'none', label: 'None' },
            ]}
          />
        </div>
      </div>

      {/* Language Preference */}
      <div>
        <h3 className="text-lg font-semibold text-white/90 mb-2">Language Preference</h3>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <SelectField
            label="Audio preference"
            value={langPref}
            onChange={setLangPref}
            options={[
              { value: 'all', label: 'All (Sub & Dub)' },
              { value: 'sub', label: 'Subbed Only' },
              { value: 'dub', label: 'Dubbed Only' },
            ]}
          />
        </div>
      </div>

      {/* Watchlist Folders */}
      <div>
        <h3 className="text-lg font-semibold text-white/90 mb-2">Watchlist Folders</h3>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2">
          {[
            { label: 'Watching', color: 'bg-green-500' },
            { label: 'Planning', color: 'bg-orange-500' },
            { label: 'Paused', color: 'bg-yellow-500' },
            { label: 'Completed', color: 'bg-blue-500' },
            { label: 'Dropped', color: 'bg-red-500' },
          ].map((folder) => (
            <div
              key={folder.label}
              className="flex items-center gap-3 py-2"
            >
              <span className={`w-2 h-2 rounded-full ${folder.color}`} />
              <span className="text-sm text-white/70">{folder.label}</span>
              <ChevronRight className="w-4 h-4 text-white/20 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Sync Tab Content ── */
function SyncTab() {
  const [syncThreshold, setSyncThreshold] = useState(80);

  return (
    <div className="space-y-6">
      {/* Sync Connection */}
      <div>
        <h3 className="text-lg font-semibold text-white/90 mb-4">Jikan Sync</h3>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold text-sm">JK</span>
              </div>
              <div>
                <p className="text-sm font-medium text-white/80">Jikan Metadata</p>
                <p className="text-xs text-white/30">Managed by background sync</p>
              </div>
            </div>
            <span className="px-4 py-2 rounded-lg border border-white/10 text-sm text-white/50">
              Automatic
            </span>
          </div>
        </div>
      </div>

      {/* About Sync */}
      <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.01] p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-primary/60 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-white/70 mb-1">About Sync</h4>
            <p className="text-xs text-white/40 leading-relaxed">
              AniVault syncs anime metadata from Jikan into your database in the background. The
              worker resumes where it left off, skips unchanged anime, and keeps your local anime
              catalog up to date automatically.
            </p>
            <ul className="mt-2 space-y-1">
              <li className="text-xs text-white/40 flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-primary/60" />
                Background metadata sync
              </li>
              <li className="text-xs text-white/40 flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-primary/60" />
                Resume from last saved page
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Sync Threshold */}
      <div>
        <h3 className="text-lg font-semibold text-white/90 mb-2">Sync Threshold</h3>
        <p className="text-xs text-white/40 mb-3">
          The watch percentage required to mark progress as watched locally.
        </p>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Threshold</span>
            <span className="text-sm font-semibold text-primary">{syncThreshold}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={syncThreshold}
            onChange={(e) => setSyncThreshold(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none bg-white/10 cursor-pointer accent-primary
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(139,92,246,0.45)]
              [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-[0_0_10px_rgba(139,92,246,0.45)]"
          />
        </div>
      </div>

      {/* Sign in required for sync */}
      <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.01] p-4 text-center">
        <p className="text-sm text-white/50 mb-3">Sign in required</p>
        <p className="text-xs text-white/30 mb-4">
          Please connect your account to manage sync settings.
        </p>
        <button className="px-4 py-2 rounded-lg bg-primary text-black font-semibold text-sm hover:bg-primary/90 transition-colors">
          Sign In
        </button>
      </div>

      {/* Data Management */}
      <div>
        <h3 className="text-lg font-semibold text-white/90 mb-2">Data Management</h3>
        <p className="text-xs text-white/40 mb-3">
          Export your watchlist for backup or migrate your data by importing it into AniVault.
        </p>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-4">
          {/* JSON format */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">JSON (AniVault)</p>
              <p className="text-xs text-white/30">Native format with full profile data.</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-white/50 hover:bg-white/5 hover:text-white transition-colors">
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
              <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-white/50 hover:bg-white/5 hover:text-white transition-colors">
                <Upload className="w-3.5 h-3.5" />
                Import
              </button>
            </div>
          </div>

          <SectionDivider />

          {/* XML format */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">XML (MyAnimeList)</p>
              <p className="text-xs text-white/30">Standard schema for tracker compatibility.</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-white/50 hover:bg-white/5 hover:text-white transition-colors">
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
              <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-white/50 hover:bg-white/5 hover:text-white transition-colors">
                <Upload className="w-3.5 h-3.5" />
                Import
              </button>
            </div>
          </div>

          <SectionDivider />

          {/* Plain Text format */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">Plain Text</p>
              <p className="text-xs text-white/30">Simple list format (legacy AniVault).</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-white/50 hover:bg-white/5 hover:text-white transition-colors">
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
              <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-white/50 hover:bg-white/5 hover:text-white transition-colors">
                <Upload className="w-3.5 h-3.5" />
                Import
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Security Tab Content ── */
function SecurityTab() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="space-y-6">
      {/* Sign in required */}
      <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.01] p-4 text-center">
        <p className="text-sm text-white/50 mb-3">Sign in required</p>
        <p className="text-xs text-white/30 mb-4">
          Please connect your account to manage security.
        </p>
        <button className="px-4 py-2 rounded-lg bg-primary text-black font-semibold text-sm hover:bg-primary/90 transition-colors">
          Sign In
        </button>
      </div>

      {/* Change Password */}
      <div>
        <h3 className="text-lg font-semibold text-white/90 mb-4">Change Password</h3>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-1">
          <div className="py-3">
            <label className="text-sm font-medium text-white/90 block mb-2">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 pr-10 text-sm text-white/90 placeholder-white/20 outline-none transition-colors focus:border-primary/50 focus:bg-white/[0.08]"
              />
              <button
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-white/30 mt-1">
              Enter your existing password to verify your identity.
            </p>
          </div>

          <SectionDivider />

          <div className="py-3">
            <label className="text-sm font-medium text-white/90 block mb-2">New Password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 pr-10 text-sm text-white/90 placeholder-white/20 outline-none transition-colors focus:border-primary/50 focus:bg-white/[0.08]"
              />
              <button
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-white/30 mt-1">
              Must be at least 8 characters long.
            </p>
          </div>

          <SectionDivider />

          <div className="py-3">
            <label className="text-sm font-medium text-white/90 block mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 pr-10 text-sm text-white/90 placeholder-white/20 outline-none transition-colors focus:border-primary/50 focus:bg-white/[0.08]"
              />
              <button
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-white/30 mt-1">
              Re-enter your new password to confirm.
            </p>
          </div>

          <button className="w-full mt-4 px-4 py-2.5 rounded-lg bg-primary text-black font-semibold text-sm hover:bg-primary/90 transition-colors">
            Change Password
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Settings Page ── */
export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('account');

  return (
    <div className="min-h-[calc(100dvh-4rem)]">
      {/* Page Header */}
      <div className="border-b border-white/[0.06] bg-black/40 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <h1 className="text-2xl font-bold text-white/90">Settings</h1>
          <p className="text-sm text-white/40 mt-1">
            Manage your account settings, preferences, and profile.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Sidebar */}
          <aside className="lg:w-56 shrink-0">
            {/* Desktop sidebar */}
            <nav className="hidden lg:block sticky top-20 space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-white/50 hover:bg-white/[0.04] hover:text-white/80'
                  }`}
                >
                  <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-primary' : ''}`} />
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Mobile tabs - horizontal scroll */}
            <nav className="lg:hidden flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'bg-white/[0.03] text-white/50 border border-white/[0.06] hover:bg-white/[0.06] hover:text-white/70'
                  }`}
                >
                  <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'text-primary' : ''}`} />
                  {tab.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'account' && <AccountTab />}
                {activeTab === 'preferences' && <PreferencesTab />}
                {activeTab === 'sync' && <SyncTab />}
                {activeTab === 'security' && <SecurityTab />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
