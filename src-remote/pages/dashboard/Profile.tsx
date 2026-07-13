import { useState, useEffect, useRef } from 'react';
import {
  Loader2,
  Camera,
  Music,
  Save,
  Check,
  Shield,
  ShieldCheck,
  CheckCircle,
  Upload,
  Globe,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const GENRES = [
  'Amapiano',
  'Afrobeats',
  'Hip Hop',
  'Dancehall',
  'Reggae',
  'House',
  'Techno',
  'R&B',
  'Salone Mix',
  'Open Format',
];

const CITIES = [
  'Freetown',
  'Bo',
  'Kenema',
  'Makeni',
  'Koidu Town',
  'Port Loko',
  'Lunsar',
  'Waterloo',
  'Kabala',
  'Magburaka',
  'Kailahun',
  'Moyamba',
  'Pujehun',
  'Bonthe',
  'Kambia',
];

const COUNTRIES = [
  'Sierra Leone',
  'Nigeria',
  'Ghana',
  'Liberia',
  'Guinea',
  'United Kingdom',
  'United States',
  'Canada',
  'Germany',
  'Netherlands',
  'France',
  'Other',
];

const LANGUAGES = ['English', 'Krio', 'Mende', 'Temne', 'Limba', 'Other'];

const EQUIPMENT = [
  'Controller',
  'CDJs',
  'Turntables',
  'Mixer',
  'PA System',
  'Speakers',
  'Subwoofers',
  'Lighting',
  'Smoke Machine',
  'Microphones',
  'LED Screens',
  'Generator',
  'Laptop',
];

const EVENT_TYPES = [
  'Wedding',
  'Birthday',
  'Club',
  'Festival',
  'Corporate',
  'Private Party',
  'House Party',
  'Beach Party',
  'Religious Event',
  'School Event',
  'Graduation',
  'Radio',
];

export default function Profile() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [djData, setDjData] = useState<any>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [idDocFile, setIdDocFile] = useState<File | null>(null);
  const idDocInputRef = useRef<HTMLInputElement>(null);

  // Verification form state
  const [verificationForm, setVerificationForm] = useState({
    fullLegalName: '',
    nationality: 'Sierra Leonean',
    idDocumentType: 'passport',
    socialProofLinks: '',
    whyVerified: '',
  });
  const [verificationSubmitting, setVerificationSubmitting] = useState(false);
  const isDj = user?.role === 'DJ';
  const [djId, setDjId] = useState<string | null>(user?.djProfile?.id || null);

  // Form state
  const [form, setForm] = useState({
    stageName: '',
    fullName: '',
    bio: '',
    startYear: '',
    country: '',
    city: '',
    genres: [] as string[],
    eventTypes: [] as string[],
    awards: [] as string[],
    equipment: [] as string[],
    languages: [] as string[],
    bookingFeeMin: '',
    bookingFeeMax: '',
    hourlyRate: '',
    fullDayRate: '',
    depositPercent: '30',
    currency: 'SLE',
    willTravel: false,
    maxTravelDistanceKm: '',
    services: [] as { name: string; price?: number; description?: string }[],
    website: '',
    whatsappNumber: '',
    socialLinks: {
      instagram: '',
      twitter: '',
      tiktok: '',
      youtube: '',
      facebook: '',
    } as Record<string, string>,
    streamingLinks: {
      audiomack: '',
      mixcloud: '',
      soundcloud: '',
      youtube: '',
      hearthis: '',
      appleMusic: '',
      spotify: '',
    } as Record<string, string>,
  });

  useEffect(() => {
    if (!isDj) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await api.get('/djs/me');
        if (res.data.success) {
          const dj = res.data.data;
          setDjId(dj.id);
          setDjData(dj);
          setForm({
            stageName: dj.stageName || '',
            fullName: dj.fullName || '',
            bio: dj.bio || '',
            startYear: String(dj.startYear || ''),
            country: dj.country || '',
            city: dj.city || '',
            genres: dj.genres || [],
            eventTypes: dj.eventTypes || [],
            awards: dj.awards || [],
            equipment: dj.equipment || [],
            languages: dj.languages || [],
            bookingFeeMin: String(dj.bookingFeeMin || ''),
            bookingFeeMax: String(dj.bookingFeeMax || ''),
            hourlyRate: String(dj.hourlyRate || ''),
            fullDayRate: String(dj.fullDayRate || ''),
            depositPercent: String(dj.depositPercent || '30'),
            currency: dj.currency || 'SLE',
            willTravel: dj.willTravel || false,
            maxTravelDistanceKm: String(dj.maxTravelDistanceKm || ''),
            services: Array.isArray(dj.services) ? dj.services : [],
            website: dj.website || '',
            whatsappNumber: dj.whatsappNumber || '',
            socialLinks: (() => {
              const sl = dj.socialLinks || {};
              return {
                instagram: sl.instagram ?? '',
                twitter: sl.twitter ?? '',
                tiktok: sl.tiktok ?? '',
                youtube: sl.youtube ?? '',
                facebook: sl.facebook ?? '',
              };
            })(),
            streamingLinks: (() => {
              const sl = dj.streamingLinks || {};
              return {
                audiomack: sl.audiomack ?? '',
                mixcloud: sl.mixcloud ?? '',
                soundcloud: sl.soundcloud ?? '',
                youtube: sl.youtube ?? '',
                hearthis: sl.hearthis ?? '',
                appleMusic: sl.appleMusic ?? '',
                spotify: sl.spotify ?? '',
              };
            })(),
          });
          if (dj.avatar) setAvatarPreview(dj.avatar);
          if (dj.coverBanner) setCoverPreview(dj.coverBanner);
        }
      } catch (err: any) {
        // 404 means no DJ profile yet; show empty create form
        if (err?.response?.status !== 404) {
          console.error('Failed to load profile', err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [isDj]);

  const buildFormData = () => {
    const formData = new FormData();
    const appendArray = (key: string, value: string[]) => {
      formData.append(key, JSON.stringify(value));
    };

    if (form.stageName) formData.append('stageName', form.stageName);
    if (form.fullName) formData.append('fullName', form.fullName);
    if (form.bio) formData.append('bio', form.bio);
    if (form.startYear) formData.append('startYear', form.startYear);
    if (form.country) formData.append('country', form.country);
    if (form.city) formData.append('city', form.city);
    appendArray('genres', form.genres);
    appendArray('eventTypes', form.eventTypes);
    appendArray('awards', form.awards);
    appendArray('equipment', form.equipment);
    appendArray('languages', form.languages);
    if (form.bookingFeeMin) formData.append('bookingFeeMin', form.bookingFeeMin);
    if (form.bookingFeeMax) formData.append('bookingFeeMax', form.bookingFeeMax);
    if (form.hourlyRate) formData.append('hourlyRate', form.hourlyRate);
    if (form.fullDayRate) formData.append('fullDayRate', form.fullDayRate);
    if (form.depositPercent) formData.append('depositPercent', form.depositPercent);
    if (form.currency) formData.append('currency', form.currency);
    if (form.website) formData.append('website', form.website);
    if (form.whatsappNumber) formData.append('whatsappNumber', form.whatsappNumber);
    formData.append('willTravel', String(form.willTravel));
    if (form.maxTravelDistanceKm) formData.append('maxTravelDistanceKm', form.maxTravelDistanceKm);
    formData.append('services', JSON.stringify(form.services));
    formData.append('socialLinks', JSON.stringify(form.socialLinks));
    formData.append('streamingLinks', JSON.stringify(form.streamingLinks));
    const avatarFromInput = avatarInputRef.current?.files?.[0];
    const coverFromInput = coverInputRef.current?.files?.[0];
    if (avatarFromInput) formData.append('avatar', avatarFromInput);
    if (coverFromInput) formData.append('coverBanner', coverFromInput);
    return formData;
  };

  const handleSave = async () => {
    if (!form.stageName || !form.fullName) {
      setError('Stage name and full name are required');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      let res;

      if (djId) {
        res = await api.put('/djs/me', buildFormData());
      } else {
        res = await api.post('/djs', buildFormData());
      }

      if (res.data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        const createdOrUpdated = res.data.data;
        setDjId(createdOrUpdated.id);
        setDjData(createdOrUpdated);
        // Clear file selections after successful save
        setAvatarFile(null);
        setCoverFile(null);
        // Keep previews from saved URLs if returned
        if (createdOrUpdated.avatar) setAvatarPreview(createdOrUpdated.avatar);
        if (createdOrUpdated.coverBanner) setCoverPreview(createdOrUpdated.coverBanner);
        // Refresh auth user so role/djProfile are up to date
        await useAuthStore.getState().fetchMe();
      }
    } catch (err: any) {
      const details = err.response?.data?.details;
      let msg = err.response?.data?.error || 'Failed to save profile';
      if (details?.fieldErrors) {
        const fields = Object.entries(details.fieldErrors)
          .map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`)
          .join('; ');
        msg += ` (${fields})`;
      }
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const toggleArray = (field: keyof typeof form, value: string) => {
    setForm((prev) => {
      const current = prev[field] as string[];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [field]: updated };
    });
  };

  const addService = () => {
    const name = prompt('Service name (e.g. Wedding DJ Package):');
    if (!name?.trim()) return;
    const priceStr = prompt('Price (optional, e.g. 2500):');
    const price = priceStr ? Number(priceStr) : undefined;
    const description = prompt('Description (optional):') || undefined;
    setForm((prev) => ({
      ...prev,
      services: [...prev.services, { name: name.trim(), price, description }],
    }));
  };

  const removeService = (index: number) => {
    setForm((prev) => ({ ...prev, services: prev.services.filter((_, i) => i !== index) }));
  };

  const addAward = () => {
    const award = prompt('Enter award name:');
    if (award?.trim()) {
      setForm((prev) => ({ ...prev, awards: [...prev.awards, award.trim()] }));
    }
  };

  const removeAward = (index: number) => {
    setForm((prev) => ({ ...prev, awards: prev.awards.filter((_, i) => i !== index) }));
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationForm.fullLegalName || !verificationForm.nationality || !verificationForm.idDocumentType || !idDocFile) {
      toast.error('Full legal name, nationality, ID type, and document are required');
      return;
    }

    setVerificationSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('fullLegalName', verificationForm.fullLegalName);
      formData.append('nationality', verificationForm.nationality);
      formData.append('idDocumentType', verificationForm.idDocumentType);
      if (verificationForm.socialProofLinks) formData.append('socialProofLinks', verificationForm.socialProofLinks);
      if (verificationForm.whyVerified) formData.append('whyVerified', verificationForm.whyVerified);
      formData.append('document', idDocFile);

      await api.post('/djs/verification-request', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Verification request submitted for review. Our team will get back to you within 2-3 business days.');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit verification request');
    } finally {
      setVerificationSubmitting(false);
    }
  };

  const verificationStatus = djData?.verificationStatus || 'unverified';
  const verificationPending = verificationStatus === 'pending' || verificationStatus === 'info_requested';
  const verificationRejected = verificationStatus === 'rejected';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-10 h-10 text-gold animate-spin" />
      </div>
    );
  }

  if (!isDj) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary uppercase tracking-wide">
            Fan Profile
          </h1>
        </div>

        <Card className="bg-black-surface border-dark-gray">
          <CardContent className="p-6 space-y-6">
            <div>
              <Label className="text-text-secondary mb-3 block">Avatar</Label>
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20 border-2 border-gold/30">
                  <AvatarImage src={avatarPreview || user?.avatar} />
                  <AvatarFallback className="bg-gold/20 text-gold text-xl font-bold">
                    {(user?.name || user?.username || 'U').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setAvatarFile(file);
                        const reader = new FileReader();
                        reader.onloadend = () => setAvatarPreview(reader.result as string);
                        reader.readAsDataURL(file);

                        // Upload immediately
                        const formData = new FormData();
                        formData.append('avatar', file);
                        try {
                          await api.put('/users/avatar', formData, {
                            headers: { 'Content-Type': 'multipart/form-data' },
                          });
                          toast.success('Avatar updated successfully!');
                        } catch (err: any) {
                          toast.error(err.response?.data?.error || 'Failed to update avatar');
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="bg-black-elevated border-dark-gray hover:border-gold/50 text-text-primary"
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Change Avatar
                  </Button>
                </div>
              </div>
            </div>

            {/* In the future, add Name/Bio inputs here and hit /users/profile */}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary uppercase tracking-wide">
            Profile
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <Badge className="bg-green/10 text-green border-0">
              <Check className="w-3 h-3 mr-1" />
              Saved
            </Badge>
          )}
          <Button
            className="bg-gold-gradient text-black hover:opacity-90"
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red/10 border border-red/30 text-red text-sm">
          {error}
        </div>
      )}

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="bg-black-elevated border border-dark-gray flex-wrap h-auto">
          <TabsTrigger value="basic" className="data-[state=active]:bg-gold data-[state=active]:text-black">Basic Info</TabsTrigger>
          <TabsTrigger value="photos" className="data-[state=active]:bg-gold data-[state=active]:text-black">Photos</TabsTrigger>
          <TabsTrigger value="genres" className="data-[state=active]:bg-gold data-[state=active]:text-black">Genres & Skills</TabsTrigger>
          <TabsTrigger value="pricing" className="data-[state=active]:bg-gold data-[state=active]:text-black">Pricing</TabsTrigger>
          <TabsTrigger value="marketplace" className="data-[state=active]:bg-gold data-[state=active]:text-black">Marketplace</TabsTrigger>
          <TabsTrigger value="social" className="data-[state=active]:bg-gold data-[state=active]:text-black">Social & Links</TabsTrigger>
          <TabsTrigger value="verification" className="data-[state=active]:bg-gold data-[state=active]:text-black">Verification</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="mt-4 space-y-4">
          <Card className="bg-black-surface border-dark-gray">
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-text-secondary mb-2 block">Stage Name</Label>
                  <Input
                    value={form.stageName}
                    onChange={(e) => setForm({ ...form, stageName: e.target.value })}
                    className="bg-black-elevated border-dark-gray text-text-primary"
                  />
                </div>
                <div>
                  <Label className="text-text-secondary mb-2 block">Full Name</Label>
                  <Input
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    className="bg-black-elevated border-dark-gray text-text-primary"
                  />
                </div>
              </div>

              <div>
                <Label className="text-text-secondary mb-2 block">Bio</Label>
                <Textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  rows={5}
                  maxLength={2000}
                  className="bg-black-elevated border-dark-gray text-text-primary resize-none"
                />
                <p className="text-xs text-text-muted mt-1">{form.bio.length}/2000 characters</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label className="text-text-secondary mb-2 block">Year Started DJing</Label>
                  <Input
                    type="number"
                    min={1980}
                    max={new Date().getFullYear()}
                    placeholder="e.g. 2015"
                    value={form.startYear}
                    onChange={(e) => setForm({ ...form, startYear: e.target.value })}
                    className="bg-black-elevated border-dark-gray text-text-primary"
                  />
                </div>
                <div>
                  <Label className="text-text-secondary mb-2 block">Country</Label>
                  <Select value={form.country} onValueChange={(v) => setForm({ ...form, country: v })}>
                    <SelectTrigger className="bg-black-elevated border-dark-gray text-text-primary">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent className="bg-black-surface border-dark-gray">
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-text-secondary mb-2 block">City</Label>
                  <Select value={form.city} onValueChange={(v) => setForm({ ...form, city: v })}>
                    <SelectTrigger className="bg-black-elevated border-dark-gray text-text-primary">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent className="bg-black-surface border-dark-gray">
                      {CITIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-text-secondary mb-2 block">Languages</Label>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang}
                        onClick={() => toggleArray('languages', lang)}
                        className={cn(
                          'px-3 py-1 rounded-full text-xs border transition-colors',
                          form.languages.includes(lang)
                            ? 'bg-gold/20 border-gold text-gold'
                            : 'bg-black-elevated border-dark-gray text-text-secondary hover:border-gold/30'
                        )}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="photos" className="mt-4">
          <Card className="bg-black-surface border-dark-gray">
            <CardContent className="p-6 space-y-6">
              <div>
                <Label className="text-text-secondary mb-3 block">Avatar</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="w-20 h-20 border-2 border-gold/30">
                    <AvatarImage src={avatarPreview || djData?.avatar} />
                    <AvatarFallback className="bg-gold/20 text-gold text-xl font-bold">
                      {form.stageName?.slice(0, 2).toUpperCase() || 'DJ'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setAvatarFile(file);
                          const reader = new FileReader();
                          reader.onloadend = () => setAvatarPreview(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      className="border-dark-gray text-text-primary"
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      {avatarFile ? 'Change Avatar' : 'Upload Avatar'}
                    </Button>
                    {avatarFile && (
                      <p className="text-xs text-green mt-1">{avatarFile.name} selected</p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-text-muted mt-2">Recommended: 400x400px square image</p>
              </div>

              <div className="border-t border-dark-gray pt-6">
                <Label className="text-text-secondary mb-3 block">Cover Banner</Label>
                <div className="w-full h-40 rounded-xl bg-black-elevated border border-dashed border-dark-gray overflow-hidden relative">
                  {coverPreview || djData?.coverBanner ? (
                    <img
                      src={coverPreview || djData?.coverBanner}
                      alt="Cover banner"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <Camera className="w-8 h-8 text-text-muted mb-2" />
                      <p className="text-sm text-text-secondary">Upload cover banner</p>
                      <p className="text-xs text-text-muted">Recommended: 1920x1080px</p>
                    </div>
                  )}
                </div>
                <div className="mt-3">
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCoverFile(file);
                        const reader = new FileReader();
                        reader.onloadend = () => setCoverPreview(reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    className="border-dark-gray text-text-primary"
                    onClick={() => coverInputRef.current?.click()}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {coverFile ? 'Change Cover' : 'Upload Cover'}
                  </Button>
                  {coverFile && (
                    <p className="text-xs text-green mt-1">{coverFile.name} selected</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="genres" className="mt-4 space-y-4">
          <Card className="bg-black-surface border-dark-gray">
            <CardContent className="p-6 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-text-secondary block">Genres</Label>
                  <span className={cn('text-xs', form.genres.length >= 5 ? 'text-gold' : 'text-text-muted')}>
                    {form.genres.length}/5 selected
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {GENRES.map((genre) => (
                    <button
                      key={genre}
                      onClick={() => toggleArray('genres', genre)}
                      disabled={!form.genres.includes(genre) && form.genres.length >= 5}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs border transition-colors',
                        form.genres.includes(genre)
                          ? 'bg-gold/20 border-gold text-gold'
                          : 'bg-black-elevated border-dark-gray text-text-secondary hover:border-gold/30',
                        !form.genres.includes(genre) && form.genres.length >= 5 && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <Music className="w-3 h-3 inline mr-1" />
                      {genre}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-dark-gray pt-6">
                <Label className="text-text-secondary mb-3 block">Equipment</Label>
                <div className="flex flex-wrap gap-2">
                  {EQUIPMENT.map((eq) => (
                    <button
                      key={eq}
                      onClick={() => toggleArray('equipment', eq)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs border transition-colors',
                        form.equipment.includes(eq)
                          ? 'bg-gold/20 border-gold text-gold'
                          : 'bg-black-elevated border-dark-gray text-text-secondary hover:border-gold/30'
                      )}
                    >
                      {eq}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-dark-gray pt-6">
                <Label className="text-text-secondary mb-3 block">Event Types You Cover</Label>
                <div className="flex flex-wrap gap-2">
                  {EVENT_TYPES.map((et) => (
                    <button
                      key={et}
                      onClick={() => toggleArray('eventTypes', et)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs border transition-colors',
                        form.eventTypes.includes(et)
                          ? 'bg-gold/20 border-gold text-gold'
                          : 'bg-black-elevated border-dark-gray text-text-secondary hover:border-gold/30'
                      )}
                    >
                      {et}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-dark-gray pt-6">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-text-secondary block">Awards</Label>
                  <Button variant="ghost" size="sm" className="text-gold hover:bg-gold/10" onClick={addAward}>
                    + Add Award
                  </Button>
                </div>
                <div className="space-y-2">
                  {form.awards.map((award, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-black-elevated">
                      <span className="text-sm text-text-primary">{award}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red hover:bg-red/10 h-6 px-2"
                        onClick={() => removeAward(i)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  {form.awards.length === 0 && (
                    <p className="text-sm text-text-muted italic">No awards added yet</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing" className="mt-4">
          <Card className="bg-black-surface border-dark-gray">
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-text-secondary mb-2 block">Min Booking Fee (SLE)</Label>
                  <Input
                    type="number"
                    value={form.bookingFeeMin}
                    onChange={(e) => setForm({ ...form, bookingFeeMin: e.target.value })}
                    className="bg-black-elevated border-dark-gray text-text-primary"
                  />
                </div>
                <div>
                  <Label className="text-text-secondary mb-2 block">Max Booking Fee (SLE)</Label>
                  <Input
                    type="number"
                    value={form.bookingFeeMax}
                    onChange={(e) => setForm({ ...form, bookingFeeMax: e.target.value })}
                    className="bg-black-elevated border-dark-gray text-text-primary"
                  />
                </div>
                <div>
                  <Label className="text-text-secondary mb-2 block">Currency</Label>
                  <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                    <SelectTrigger className="bg-black-elevated border-dark-gray text-text-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black-surface border-dark-gray">
                      <SelectItem value="SLE">SLE (Sierra Leone)</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-text-muted">
                Setting a price range helps clients understand your rates before reaching out.
              </p>

            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="marketplace" className="mt-4 space-y-4">
          <Card className="bg-black-surface border-dark-gray">
            <CardContent className="p-6 space-y-6">
              <div>
                <Label className="text-text-secondary mb-3 block">Event Types You Cover</Label>
                <div className="flex flex-wrap gap-2">
                  {EVENT_TYPES.map((et) => (
                    <button
                      key={et}
                      onClick={() => toggleArray('eventTypes', et)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs border transition-colors',
                        form.eventTypes.includes(et)
                          ? 'bg-gold/20 border-gold text-gold'
                          : 'bg-black-elevated border-dark-gray text-text-secondary hover:border-gold/30'
                      )}
                    >
                      {et}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-dark-gray pt-6">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-text-secondary block">Services & Packages</Label>
                  <Button variant="ghost" size="sm" className="text-gold hover:bg-gold/10" onClick={addService}>
                    + Add Service
                  </Button>
                </div>
                <div className="space-y-2">
                  {form.services.map((service, i) => (
                    <div key={i} className="flex items-start justify-between p-3 rounded-lg bg-black-elevated border border-dark-gray">
                      <div>
                        <p className="text-sm font-medium text-text-primary">{service.name}</p>
                        {service.price !== undefined && <p className="text-xs text-gold">SLE {service.price}</p>}
                        {service.description && <p className="text-xs text-text-secondary mt-1">{service.description}</p>}
                      </div>
                      <Button variant="ghost" size="sm" className="text-red hover:bg-red/10 h-6 px-2" onClick={() => removeService(i)}>
                        Remove
                      </Button>
                    </div>
                  ))}
                  {form.services.length === 0 && <p className="text-sm text-text-muted italic">No services added yet</p>}
                </div>
              </div>

              <div className="border-t border-dark-gray pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-black-elevated border border-dark-gray">
                  <input
                    type="checkbox"
                    id="willTravel"
                    checked={form.willTravel}
                    onChange={(e) => setForm({ ...form, willTravel: e.target.checked })}
                    className="w-4 h-4 accent-gold rounded border-dark-gray bg-black-surface"
                  />
                  <Label htmlFor="willTravel" className="text-text-secondary text-sm cursor-pointer">
                    Willing to travel for events
                  </Label>
                </div>
                <div>
                  <Label className="text-text-secondary mb-2 block">Max Travel Distance (km)</Label>
                  <Input
                    type="number"
                    value={form.maxTravelDistanceKm}
                    onChange={(e) => setForm({ ...form, maxTravelDistanceKm: e.target.value })}
                    placeholder="e.g. 50"
                    className="bg-black-elevated border-dark-gray text-text-primary"
                  />
                </div>
              </div>

              <div className="border-t border-dark-gray pt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-text-secondary mb-2 block">Hourly Rate (SLE)</Label>
                  <Input
                    type="number"
                    value={form.hourlyRate}
                    onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
                    className="bg-black-elevated border-dark-gray text-text-primary"
                  />
                </div>
                <div>
                  <Label className="text-text-secondary mb-2 block">Full Day Rate (SLE)</Label>
                  <Input
                    type="number"
                    value={form.fullDayRate}
                    onChange={(e) => setForm({ ...form, fullDayRate: e.target.value })}
                    className="bg-black-elevated border-dark-gray text-text-primary"
                  />
                </div>
                <div>
                  <Label className="text-text-secondary mb-2 block">Deposit Required (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={form.depositPercent}
                    onChange={(e) => setForm({ ...form, depositPercent: e.target.value })}
                    className="bg-black-elevated border-dark-gray text-text-primary"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="mt-4 space-y-4">
          <Card className="bg-black-surface border-dark-gray">
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-text-secondary mb-2 block">Website</Label>
                  <Input
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    placeholder="https://..."
                    className="bg-black-elevated border-dark-gray text-text-primary"
                  />
                </div>
                <div>
                  <Label className="text-text-secondary mb-2 block">WhatsApp Number</Label>
                  <Input
                    value={form.whatsappNumber}
                    onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
                    placeholder="+232..."
                    className="bg-black-elevated border-dark-gray text-text-primary"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black-surface border-dark-gray">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-text-primary">
                Social Media
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/...' },
                  { key: 'twitter', label: 'X (Twitter)', placeholder: 'https://x.com/...' },
                  { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@...' },
                  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/...' },
                  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/...' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <Label className="text-text-secondary mb-2 block">{label}</Label>
                    <Input
                      value={form.socialLinks[key] || ''}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          socialLinks: { ...form.socialLinks, [key]: e.target.value },
                        })
                      }
                      placeholder={placeholder}
                      className="bg-black-elevated border-dark-gray text-text-primary"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black-surface border-dark-gray">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-text-primary">
                Streaming Platforms
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'audiomack', label: 'Audiomack', placeholder: 'https://audiomack.com/...' },
                  { key: 'mixcloud', label: 'Mixcloud', placeholder: 'https://mixcloud.com/...' },
                  { key: 'soundcloud', label: 'SoundCloud', placeholder: 'https://soundcloud.com/...' },
                  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/...' },
                  { key: 'hearthis', label: 'Hearthis.at', placeholder: 'https://hearthis.at/...' },
                  { key: 'appleMusic', label: 'Apple Music', placeholder: 'https://music.apple.com/...' },
                  { key: 'spotify', label: 'Spotify', placeholder: 'https://open.spotify.com/...' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <Label className="text-text-secondary mb-2 block">{label}</Label>
                    <Input
                      value={form.streamingLinks[key] || ''}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          streamingLinks: { ...form.streamingLinks, [key]: e.target.value },
                        })
                      }
                      placeholder={placeholder}
                      className="bg-black-elevated border-dark-gray text-text-primary"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verification" className="mt-4">
          <Card className="bg-black-surface border-dark-gray">
            <CardContent className="p-6 space-y-6">
              {/* Verification Status */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-black-elevated border border-dark-gray">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  djData?.verified ? 'bg-green/20 text-green' : verificationPending ? 'bg-yellow-500/20 text-yellow-500' : verificationRejected ? 'bg-red/20 text-red' : 'bg-yellow-500/20 text-yellow-500'
                }`}>
                  {djData?.verified ? <ShieldCheck className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">
                    {djData?.verified ? 'Verified DJ' : verificationPending ? 'Verification Pending' : verificationRejected ? 'Verification Rejected' : 'Not Verified'}
                  </h3>
                  <p className="text-xs text-text-secondary">
                    {djData?.verified
                      ? 'Your profile has been verified by The Deck Salone team.'
                      : verificationPending
                        ? 'Your verification request is under review. We will notify you once it is processed.'
                        : verificationRejected
                          ? (djData?.verificationNotes || 'Your verification was rejected. You may resubmit.')
                          : 'Get verified to build trust with clients and unlock premium features.'}
                  </p>
                </div>
                {djData?.verified && (
                  <Badge className="bg-green/10 text-green border-0 ml-auto">Verified</Badge>
                )}
                {verificationPending && (
                  <Badge className="bg-yellow-500/10 text-yellow-500 border-0 ml-auto">Pending</Badge>
                )}
                {verificationRejected && (
                  <Badge className="bg-red/10 text-red border-0 ml-auto">Rejected</Badge>
                )}
              </div>

              {!djData?.verified && !verificationPending && (
                <form className="space-y-4" onSubmit={handleVerificationSubmit}>
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-text-primary">
                      Request Verification
                    </h3>
                    <p className="text-xs text-text-secondary mt-1">
                      Submit your passport or national ID for review. Our team will verify your identity and DJ credentials within 2-3 business days.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-text-secondary mb-2 block">Full Legal Name</Label>
                      <Input
                        value={verificationForm.fullLegalName}
                        onChange={(e) => setVerificationForm({ ...verificationForm, fullLegalName: e.target.value })}
                        placeholder="As shown on your ID"
                        className="bg-black-elevated border-dark-gray text-text-primary"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-text-secondary mb-2 block">Nationality</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <Input
                          value={verificationForm.nationality}
                          onChange={(e) => setVerificationForm({ ...verificationForm, nationality: e.target.value })}
                          placeholder="e.g. Sierra Leonean"
                          className="bg-black-elevated border-dark-gray text-text-primary pl-9"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-text-secondary mb-2 block">ID Document Type</Label>
                    <Select
                      value={verificationForm.idDocumentType}
                      onValueChange={(v) => setVerificationForm({ ...verificationForm, idDocumentType: v })}
                    >
                      <SelectTrigger className="bg-black-elevated border-dark-gray text-text-primary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-black-surface border-dark-gray">
                        <SelectItem value="passport">Passport</SelectItem>
                        <SelectItem value="national_id">National ID</SelectItem>
                        <SelectItem value="drivers_license">Driver's License</SelectItem>
                        <SelectItem value="residence_permit">Residence Permit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-text-secondary mb-2 block">ID Document</Label>
                    <input
                      ref={idDocInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={(e) => setIdDocFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => idDocInputRef.current?.click()}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-dark-gray hover:border-gold/50 transition-colors bg-black-elevated"
                    >
                      <FileText className="w-5 h-5 text-gold" />
                      <span className="text-sm text-text-secondary">
                        {idDocFile ? idDocFile.name : 'Upload passport, ID, or permit (PDF/image)'}
                      </span>
                    </button>
                    {idDocFile && (
                      <p className="text-xs text-green mt-1">{idDocFile.name} selected</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-text-secondary mb-2 block">Social Proof Links</Label>
                    <Textarea
                      value={verificationForm.socialProofLinks}
                      onChange={(e) => setVerificationForm({ ...verificationForm, socialProofLinks: e.target.value })}
                      placeholder="Links to your mixes, event photos, or press coverage..."
                      rows={3}
                      className="bg-black-elevated border-dark-gray text-text-primary resize-none"
                    />
                  </div>

                  <div>
                    <Label className="text-text-secondary mb-2 block">Why should you be verified?</Label>
                    <Textarea
                      value={verificationForm.whyVerified}
                      onChange={(e) => setVerificationForm({ ...verificationForm, whyVerified: e.target.value })}
                      placeholder="Tell us about your experience, venues played, and audience..."
                      rows={3}
                      className="bg-black-elevated border-dark-gray text-text-primary resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={verificationSubmitting}
                    className="w-full bg-gold-gradient text-black font-semibold uppercase hover:opacity-90"
                  >
                    {verificationSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    {verificationSubmitting ? 'Submitting...' : 'Submit Verification Request'}
                  </Button>
                </form>
              )}

              {djData?.verified && (
                <div className="p-4 rounded-xl bg-black-elevated border border-dark-gray">
                  <h4 className="text-sm font-semibold text-text-primary mb-2">Verification Benefits</h4>
                  <ul className="space-y-2 text-xs text-text-secondary">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green" />
                      Verified badge on your public profile
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green" />
                      Higher ranking in search results
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green" />
                      Priority booking requests from clients
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green" />
                      Access to premium analytics
                    </li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}
