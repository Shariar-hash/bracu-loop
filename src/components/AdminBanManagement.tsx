import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Ban, Shield, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import AdminService, { BannedUser } from "@/lib/adminService";

const AdminBanManagement: React.FC = () => {
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banFormData, setBanFormData] = useState({
    user_email: '',
    user_name: '',
    reason: '',
    duration_days: null as number | null,
    admin_notes: ''
  });

  const banDurationOptions = AdminService.getBanDurationOptions();

  useEffect(() => {
    loadBannedUsers();
  }, []);

  const loadBannedUsers = async () => {
    try {
      setLoading(true);
      const users = await AdminService.getBannedUsers();
      setBannedUsers(users);
    } catch (error) {
      console.error('Error loading banned users:', error);
      toast.error('Failed to load banned users');
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async () => {
    if (!banFormData.user_email || !banFormData.reason) {
      toast.error('Please fill in email and reason');
      return;
    }

    try {
      await AdminService.banUser({
        user_email: banFormData.user_email,
        user_name: banFormData.user_name,
        duration_days: banFormData.duration_days,
        reason: banFormData.reason,
        banned_by_admin: 'admin@example.com', // Replace with actual admin email
        admin_notes: banFormData.admin_notes
      });

      toast.success(`User ${banFormData.user_email} has been banned successfully`);
      
      setBanDialogOpen(false);
      setBanFormData({
        user_email: '',
        user_name: '',
        reason: '',
        duration_days: null,
        admin_notes: ''
      });
      
      await loadBannedUsers();
    } catch (error) {
      console.error('Error banning user:', error);
      toast.error('Failed to ban user');
    }
  };

  const handleUnbanUser = async (banId: string) => {
    try {
      await AdminService.unbanUser(banId);
      toast.success('User has been unbanned');
      await loadBannedUsers();
    } catch (error) {
      console.error('Error unbanning user:', error);
      toast.error('Failed to unban user');
    }
  };

  const formatBanDuration = (user: BannedUser) => {
    if (user.is_permanent) {
      return 'Permanent';
    }
    
    if (user.expires_at) {
      const expiryDate = new Date(user.expires_at);
      const now = new Date();
      const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysRemaining <= 0) {
        return 'Expired';
      }
      
      return `${daysRemaining} days remaining`;
    }
    
    return user.ban_duration || 'Unknown duration';
  };

  const getBanStatusColor = (user: BannedUser) => {
    if (user.is_permanent) return 'bg-red-100 text-red-800';
    
    if (user.expires_at) {
      const expiryDate = new Date(user.expires_at);
      const now = new Date();
      const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysRemaining <= 0) return 'bg-gray-100 text-gray-800';
      if (daysRemaining <= 7) return 'bg-yellow-100 text-yellow-800';
    }
    
    return 'bg-orange-100 text-orange-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            User Ban Management
          </h2>
          <p className="text-muted-foreground">
            Manage user bans with Facebook-like duplicate report handling
          </p>
        </div>

        <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Ban className="h-4 w-4 mr-2" />
              Ban User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Ban User</DialogTitle>
              <DialogDescription>
                Select ban duration and provide a reason for the ban.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="ban-email">User Email *</Label>
                <Input
                  id="ban-email"
                  placeholder="user@example.com"
                  value={banFormData.user_email}
                  onChange={(e) => setBanFormData({ ...banFormData, user_email: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="ban-name">User Name (optional)</Label>
                <Input
                  id="ban-name"
                  placeholder="John Doe"
                  value={banFormData.user_name}
                  onChange={(e) => setBanFormData({ ...banFormData, user_name: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="ban-duration">Ban Duration *</Label>
                <Select 
                  value={banFormData.duration_days?.toString() || 'null'} 
                  onValueChange={(value) => setBanFormData({ 
                    ...banFormData, 
                    duration_days: value === 'null' ? null : parseInt(value)
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select ban duration..." />
                  </SelectTrigger>
                  <SelectContent>
                    {banDurationOptions.map((option) => (
                      <SelectItem key={option.value?.toString() || 'null'} value={option.value?.toString() || 'null'}>
                        <div className="flex flex-col">
                          <span className="font-medium">{option.label}</span>
                          <span className="text-xs text-muted-foreground">{option.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="ban-reason">Reason for Ban *</Label>
                <Select 
                  value={banFormData.reason} 
                  onValueChange={(value) => setBanFormData({ ...banFormData, reason: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spam">Spam Content</SelectItem>
                    <SelectItem value="harassment">Harassment</SelectItem>
                    <SelectItem value="inappropriate">Inappropriate Content</SelectItem>
                    <SelectItem value="copyright">Copyright Violation</SelectItem>
                    <SelectItem value="multiple_violations">Multiple Policy Violations</SelectItem>
                    <SelectItem value="hate_speech">Hate Speech</SelectItem>
                    <SelectItem value="malicious">Malicious Behavior</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="ban-notes">Admin Notes (optional)</Label>
                <Textarea
                  id="ban-notes"
                  placeholder="Additional notes about this ban..."
                  value={banFormData.admin_notes}
                  onChange={(e) => setBanFormData({ ...banFormData, admin_notes: e.target.value })}
                />
              </div>

              {banFormData.duration_days === null && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Warning:</strong> You are about to issue a permanent ban. 
                    This action should be reserved for severe violations only.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setBanDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleBanUser} variant="destructive">
                {banFormData.duration_days === null ? 'Permanently Ban User' : 'Temporarily Ban User'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : bannedUsers.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No banned users found</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bannedUsers.map((user) => (
            <Card key={user.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{user.user_name || 'Unknown User'}</CardTitle>
                    <CardDescription>{user.user_email}</CardDescription>
                  </div>
                  <Badge className={getBanStatusColor(user)} variant="secondary">
                    {user.is_permanent ? 'Permanent' : 'Temporary'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{formatBanDuration(user)}</span>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium">Reason:</p>
                    <p className="text-sm text-muted-foreground">{user.reason}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium">Banned by:</p>
                    <p className="text-sm text-muted-foreground">{user.banned_by}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium">Date:</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-4"
                  onClick={() => handleUnbanUser(user.id)}
                >
                  Unban User
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminBanManagement;