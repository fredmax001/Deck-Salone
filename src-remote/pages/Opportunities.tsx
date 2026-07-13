import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Calendar,
    MapPin,
    DollarSign,
    CheckCircle,
    Clock,
    AlertCircle,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { useUpgradeModalStore } from '@/stores/upgradeModalStore';

interface Opportunity {
    id: string;
    title: string;
    description: string;
    eventType: string;
    eventDate: string;
    eventLocation: string;
    budget: number;
    budgetCurrency: string;
    genres: string[];
    musicStyle?: string;
    hours?: number;
    requirements?: string;
    equipmentNeeded?: string[];
    isFeatured: boolean;
    nearYou?: boolean;
    requiredTier: 'pro' | 'legend';
    status: string;
    userHasApplied: boolean;
    userApplication?: { id: string; status: string };
    applicants?: number;
}

export const Opportunities = () => {
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'applied' | 'featured'>('all');
    const [applying, setApplying] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const { checkFeature } = useFeatureAccess();
    const { open } = useUpgradeModalStore();

    // Fetch opportunities
    useEffect(() => {
        const fetchOpportunities = async () => {
            try {
                setLoading(true);
                const res = await api.get('/opportunities');
                setOpportunities(res.data.data || []);
            } catch (err: any) {
                console.error('Failed to load opportunities', err);
                toast.error(err.response?.data?.error || 'Failed to load opportunities');
            } finally {
                setLoading(false);
            }
        };
        fetchOpportunities();
    }, []);

    // Filter opportunities
    const filtered = opportunities.filter((opp) => {
        if (filter === 'applied') return opp.userHasApplied;
        if (filter === 'featured') return opp.isFeatured;
        return true;
    });

    // Apply for opportunity
    const handleApply = async (opp: Opportunity) => {
        // Check tier first
        if (!checkFeature('pro', 'Contact Opportunity Organizers')) {
            return;
        }

        // Check if already applied
        if (opp.userHasApplied) {
            toast.info('You have already applied for this opportunity');
            return;
        }

        if (!checkFeature(opp.requiredTier, 'Contact Opportunity Organizers')) {
            return;
        }

        try {
            setApplying(opp.id);
            const res = await api.post(`/opportunities/${opp.id}/apply`, {
                message: 'Interested in this opportunity. Please share the organizer contact details.',
            });

            if (res.data.success) {
                toast.success('Contact request sent. The organizer can review your profile.');
                // Update UI
                setOpportunities((prev) =>
                    prev.map((o) =>
                        o.id === opp.id
                            ? { ...o, userHasApplied: true, userApplication: res.data.data }
                            : o
                    )
                );
            }
        } catch (err: any) {
            const error = err.response?.data?.error || 'Failed to apply';
            toast.error(error);
            if (err.response?.status === 403) {
                // Tier error - open modal
                open('Apply for Opportunities', err.response?.data?.requiredTier || 'pro');
            }
        } finally {
            setApplying(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Clock className="w-8 h-8 animate-spin text-gold mx-auto mb-2" />
                    <p className="text-text-secondary">Loading opportunities...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-display font-bold text-text-primary uppercase tracking-wide">
                        Opportunities
                    </h1>
                </div>

                {/* Filters */}
                <div className="flex gap-2 flex-wrap">
                    {['all', 'applied', 'featured'].map((f) => (
                        <Button
                            key={f}
                            variant={filter === f ? 'default' : 'outline'}
                            onClick={() => setFilter(f as any)}
                            className="capitalize"
                        >
                            {f === 'all'
                                ? `All (${opportunities.length})`
                                : f === 'applied'
                                    ? `Applied (${opportunities.filter((o) => o.userHasApplied).length})`
                                    : `Featured (${opportunities.filter((o) => o.isFeatured).length})`}
                        </Button>
                    ))}
                </div>

                {/* Opportunities List */}
                {filtered.length === 0 ? (
                    <Card className="p-8 text-center border-gold/20">
                        <AlertCircle className="w-8 h-8 text-gold mx-auto mb-3" />
                        <p className="text-text-secondary">
                            {filter === 'applied'
                                ? 'No applications yet. Browse opportunities and apply!'
                                : 'No opportunities available right now. Check back soon!'}
                        </p>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {filtered.map((opp) => (
                            <Card
                                key={opp.id}
                                className={`p-6 border-gold/20 transition-all ${opp.isFeatured ? 'border-gold/50 bg-gold/5' : ''
                                    }`}
                            >
                                <CardContent className="p-0">
                                    {/* Title and Badges */}
                                    <div className="flex justify-between items-start mb-4 gap-4">
                                        <div>
                                            <h3 className="text-xl font-semibold text-text-primary flex items-center gap-2">
                                                {opp.title}
                                                {opp.isFeatured && (
                                                    <Badge className="bg-gold text-black text-xs">Featured</Badge>
                                                )}
                                                {opp.nearYou && (
                                                    <Badge variant="outline" className="border-green/40 text-green text-xs">Near You</Badge>
                                                )}
                                            </h3>
                                            <p className="text-text-secondary text-sm mt-1 line-clamp-2">
                                                {opp.description}
                                            </p>
                                        </div>
                                        {opp.userHasApplied && (
                                            <Badge className="bg-green/20 text-green flex-shrink-0">
                                                <CheckCircle className="w-3 h-3 mr-1" />
                                                Applied
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Event Details Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                        <div>
                                            <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">
                                                Date
                                            </p>
                                            <div className="flex items-center gap-2 text-sm text-text-secondary mt-1">
                                                <Calendar className="w-4 h-4 flex-shrink-0" />
                                                {new Date(opp.eventDate).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                })}
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">
                                                Location
                                            </p>
                                            <div className="flex items-center gap-2 text-sm text-text-secondary mt-1">
                                                <MapPin className="w-4 h-4 flex-shrink-0" />
                                                {opp.eventLocation}
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">
                                                Budget
                                            </p>
                                            <div className="flex items-center gap-2 text-sm text-text-secondary mt-1">
                                                <DollarSign className="w-4 h-4 flex-shrink-0" />
                                                {opp.budgetCurrency} {opp.budget.toLocaleString()}
                                            </div>
                                        </div>

                                        {opp.hours && (
                                            <div>
                                                <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">
                                                    Duration
                                                </p>
                                                <div className="flex items-center gap-2 text-sm text-text-secondary mt-1">
                                                    <Clock className="w-4 h-4 flex-shrink-0" />
                                                    {opp.hours} hours
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Tags */}
                                    {(opp.genres?.length || opp.eventType) && (
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {opp.eventType && (
                                                <Badge variant="outline" className="text-xs">
                                                    {opp.eventType}
                                                </Badge>
                                            )}
                                            {opp.genres?.map((genre) => (
                                                <Badge key={genre} variant="outline" className="text-xs">
                                                    {genre}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}

                                    {/* Requirements */}
                                    {opp.requirements && (
                                        <p className="text-sm text-text-secondary bg-black/30 rounded p-3 mb-4">
                                            <span className="font-semibold">Requirements:</span> {opp.requirements}
                                        </p>
                                    )}

                                    {expandedId === opp.id && (
                                        <div className="mb-4 rounded-lg border border-dark-gray bg-black/30 p-4 text-sm text-text-secondary">
                                            <p className="leading-relaxed">{opp.description}</p>
                                            {opp.equipmentNeeded?.length ? (
                                                <div className="mt-4">
                                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">Equipment Needed</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {opp.equipmentNeeded.map((item) => (
                                                            <Badge key={item} variant="outline" className="text-xs">
                                                                {item}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>
                                    )}

                                    {/* CTA Buttons */}
                                    <div className="flex gap-3 justify-between items-center">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setExpandedId(expandedId === opp.id ? null : opp.id)}
                                            className="flex-1"
                                        >
                                            {expandedId === opp.id ? (
                                                <>
                                                    <ChevronUp className="mr-2 h-4 w-4" />
                                                    Close
                                                </>
                                            ) : (
                                                <>
                                                    <ChevronDown className="mr-2 h-4 w-4" />
                                                    View Details
                                                </>
                                            )}
                                        </Button>
                                        <Button
                                            onClick={() => handleApply(opp)}
                                            disabled={
                                                applying === opp.id ||
                                                opp.userHasApplied
                                            }
                                            className={`flex-1 ${opp.userHasApplied
                                                    ? 'bg-green/20 text-green hover:bg-green/30'
                                                    : 'bg-gold-gradient text-black hover:opacity-90'
                                                }`}
                                        >
                                            {opp.userHasApplied ? (
                                                'Contact Requested'
                                            ) : applying === opp.id ? (
                                                'Submitting...'
                                            ) : (
                                                'Contact Organizer'
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

        </>
    );
};
