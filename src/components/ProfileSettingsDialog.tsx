import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon, Upload, Trash2, Loader2 } from 'lucide-react';
import { uploadToTelegram, getTelegramImageUrl } from '@/lib/telegram';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { toast } from 'sonner';

interface ShopProfile {
  profileImageFileId?: string;
  backgroundImageFileId?: string;
  loginBackgroundImageFileId?: string;
}

export const ProfileSettingsDialog: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<ShopProfile>({});
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);
  const [isUploadingLoginBackground, setIsUploadingLoginBackground] = useState(false);
  const [profileUrl, setProfileUrl] = useState<string | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [loginBackgroundUrl, setLoginBackgroundUrl] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'shopProfile'), (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data() as ShopProfile);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/shopProfile');
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (profile.profileImageFileId) {
      getTelegramImageUrl(profile.profileImageFileId).then(setProfileUrl).catch(console.error);
    } else {
      setProfileUrl(null);
    }
    if (profile.backgroundImageFileId) {
      getTelegramImageUrl(profile.backgroundImageFileId).then(setBackgroundUrl).catch(console.error);
    } else {
      setBackgroundUrl(null);
    }
    if (profile.loginBackgroundImageFileId) {
      getTelegramImageUrl(profile.loginBackgroundImageFileId).then(setLoginBackgroundUrl).catch(console.error);
    } else {
      setLoginBackgroundUrl(null);
    }
  }, [profile]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'background' | 'loginBackground') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'profile') setIsUploadingProfile(true);
    else if (type === 'background') setIsUploadingBackground(true);
    else setIsUploadingLoginBackground(true);

    try {
      const fileId = await uploadToTelegram(file);
      const fieldName = type === 'profile' ? 'profileImageFileId' : type === 'background' ? 'backgroundImageFileId' : 'loginBackgroundImageFileId';
      const newProfile = { ...profile, [fieldName]: fileId };
      await setDoc(doc(db, 'settings', 'shopProfile'), newProfile, { merge: true });
      toast.success(`${type === 'profile' ? 'Profile' : type === 'background' ? 'Header Background' : 'Login Background'} image updated successfully`);
    } catch (error) {
      console.error('Failed to upload image:', error);
      toast.error('Failed to upload image');
    } finally {
      if (type === 'profile') setIsUploadingProfile(false);
      else if (type === 'background') setIsUploadingBackground(false);
      else setIsUploadingLoginBackground(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemove = async (type: 'profile' | 'background' | 'loginBackground') => {
    try {
      const newProfile = { ...profile };
      const fieldName = type === 'profile' ? 'profileImageFileId' : type === 'background' ? 'backgroundImageFileId' : 'loginBackgroundImageFileId';
      delete newProfile[fieldName];
      await setDoc(doc(db, 'settings', 'shopProfile'), newProfile);
      toast.success(`${type === 'profile' ? 'Profile' : type === 'background' ? 'Header Background' : 'Login Background'} image removed`);
    } catch (error) {
      console.error('Failed to remove image:', error);
      toast.error('Failed to remove image');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children as React.ReactElement} />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Shop Profile Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Profile Image Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Profile Image</h3>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border">
                {profileUrl ? (
                  <img src={profileUrl} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                )}
              </div>
              <div className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleUpload(e, 'profile')}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    disabled={isUploadingProfile}
                  />
                  <Button variant="outline" className="w-full" disabled={isUploadingProfile}>
                    {isUploadingProfile ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                    Upload
                  </Button>
                </div>
                {profile.profileImageFileId && (
                  <Button variant="destructive" size="icon" onClick={() => handleRemove('profile')}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Background Image Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Header Background Image</h3>
            <div className="space-y-4">
              <div className="h-24 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden border relative">
                {backgroundUrl ? (
                  <img src={backgroundUrl} alt="Background" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleUpload(e, 'background')}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    disabled={isUploadingBackground}
                  />
                  <Button variant="outline" className="w-full" disabled={isUploadingBackground}>
                    {isUploadingBackground ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                    Upload
                  </Button>
                </div>
                {profile.backgroundImageFileId && (
                  <Button variant="destructive" size="icon" onClick={() => handleRemove('background')}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Login Background Image Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Login/Signup Background Image</h3>
            <div className="space-y-4">
              <div className="h-24 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden border relative">
                {loginBackgroundUrl ? (
                  <img src={loginBackgroundUrl} alt="Login Background" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleUpload(e, 'loginBackground')}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    disabled={isUploadingLoginBackground}
                  />
                  <Button variant="outline" className="w-full" disabled={isUploadingLoginBackground}>
                    {isUploadingLoginBackground ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                    Upload
                  </Button>
                </div>
                {profile.loginBackgroundImageFileId && (
                  <Button variant="destructive" size="icon" onClick={() => handleRemove('loginBackground')}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
