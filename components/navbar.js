"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserEdit, faSignOutAlt, faBars, faXmark } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import LoginModal from "./LoginModal";
import SignupModal from "./SignupModal";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";

export default function Navbar() {
  const router = useRouter();
  const { userProfile, isAuthenticated, logout } = useFirebaseAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
  };

  const openLoginModal = () => { setIsLoginModalOpen(true); setIsMobileMenuOpen(false); };
  const openSignupModal = () => { setIsSignupModalOpen(true); setIsMobileMenuOpen(false); };
  const closeModal = () => {
    setIsLoginModalOpen(false);
    setIsSignupModalOpen(false);
  };

  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);

  const getInitials = (user) => {
    if (user.firstName && user.lastName) return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    if (user.firstName) return user.firstName.charAt(0).toUpperCase();
    if (user.email) return user.email.charAt(0).toUpperCase();
    return '?';
  };

  const getDisplayName = (user) => {
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    if (user.firstName) return user.firstName;
    if (user.email) return user.email;
    return 'User';
  };

  return (
    <>
      <nav className={`fixed w-full z-50 transition-all duration-500 ${
        isScrolled
          ? 'bg-velvet-black/90 backdrop-blur-lg shadow-lg border-b border-velvet-border py-2'
          : 'bg-gradient-to-b from-black/70 to-transparent py-3'
      }`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center px-4 sm:px-6 lg:px-8">
          {/* Left Side - Logo & Desktop Links */}
          <div className="flex items-center gap-4 md:gap-8">
            <Link href="/" className="transform hover:scale-105 transition-transform duration-300 flex items-center gap-2">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #c9a961, #e2c887)' }}>
                <span className="font-black text-sm sm:text-base" style={{ color: '#0a0908' }}>V</span>
              </div>
              <span className="font-black text-lg sm:text-xl tracking-tight text-velvet-cream"
                style={{ fontFamily: 'serif', letterSpacing: '-0.02em' }}>
                Velvet
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              <Link href="/" passHref>
                <button className="px-4 lg:px-5 py-2 rounded-lg text-base lg:text-lg font-medium text-velvet-cream hover:bg-velvet-gold/10 transition">
                  Explore
                </button>
              </Link>
              <div className="h-5 w-[1px] mx-1 bg-velvet-gold/60" />
              <Link href="/events">
                <button className="px-4 lg:px-5 py-2 rounded-lg text-base lg:text-lg font-medium text-velvet-cream hover:bg-velvet-gold/10 transition">
                  Events
                </button>
              </Link>
              <div className="h-5 w-[1px] mx-1 bg-velvet-gold/60" />
              <Link href="/restaurant-owner">
                <button className="px-4 lg:px-5 py-2 rounded-lg text-base lg:text-lg font-medium text-velvet-cream hover:bg-velvet-gold/10 transition">
                  For Venues
                </button>
              </Link>
            </div>
          </div>

          {/* Right Side - Desktop Auth + Mobile Menu Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated && userProfile ? (
              <div className="relative hidden md:block">
                <button
                  onClick={toggleDropdown}
                  aria-label="Open profile menu"
                  className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-1.5 sm:py-2 rounded-2xl transition hover:bg-velvet-gold/10 text-velvet-cream"
                >
                  <div className="hidden lg:block text-right">
                    <p className="font-medium text-sm leading-tight">{getDisplayName(userProfile)}</p>
                    <p className="text-xs text-velvet-muted leading-tight truncate max-w-[180px]">{userProfile.email}</p>
                  </div>
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden ring-2 ring-velvet-gold shadow-lg transition hover:scale-105">
                    {userProfile.profileImage ? (
                      <Image
                        src={userProfile.profileImage}
                        alt="Profile"
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-velvet-gold to-velvet-gold-light flex items-center justify-center">
                        <span className="text-velvet-black font-bold text-sm sm:text-base">
                          {getInitials(userProfile)}
                        </span>
                      </div>
                    )}
                  </div>
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-72 sm:w-80 bg-velvet-surface/95 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl border border-velvet-border">
                    <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-velvet-gold/10 to-transparent border-b border-velvet-border">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden ring-2 ring-velvet-gold shadow-lg flex-shrink-0">
                          {userProfile.profileImage ? (
                            <Image src={userProfile.profileImage} alt="Profile" width={64} height={64} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-velvet-gold to-velvet-gold-light flex items-center justify-center">
                              <span className="text-velvet-black font-bold text-lg sm:text-xl">{getInitials(userProfile)}</span>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-velvet-cream font-semibold text-base sm:text-lg truncate">{getDisplayName(userProfile)}</p>
                          <p className="text-xs sm:text-sm text-velvet-muted truncate">{userProfile.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-2">
                      <Link href="/customer/profile" className="block" onClick={() => setIsDropdownOpen(false)}>
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-velvet-cream/80 hover:bg-velvet-gold/10 transition">
                          <FontAwesomeIcon icon={faUserEdit} className="w-5 h-5 text-velvet-gold" />
                          <span className="font-medium">Profile Settings</span>
                        </div>
                      </Link>
                      <div className="my-2 border-t border-velvet-border"></div>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition"
                      >
                        <FontAwesomeIcon icon={faSignOutAlt} className="w-5 h-5" />
                        <span className="font-medium">Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-3">
                <button
                  onClick={openLoginModal}
                  className="px-4 lg:px-5 py-2 rounded-lg text-base lg:text-lg font-medium text-velvet-cream hover:bg-velvet-gold/10 transition"
                >
                  Login
                </button>
                <div className="h-5 w-[1px] bg-velvet-gold/60" />
                <button
                  onClick={openSignupModal}
                  className="px-5 py-2 rounded-lg font-semibold text-sm bg-velvet-gold text-velvet-black hover:bg-velvet-gold-light transition shadow-lg shadow-velvet-gold/20"
                >
                  Create account
                </button>
              </div>
            )}

            {/* Mobile hamburger toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              className="md:hidden flex items-center justify-center w-11 h-11 rounded-lg text-velvet-cream hover:bg-velvet-gold/10 transition"
            >
              <FontAwesomeIcon icon={isMobileMenuOpen ? faXmark : faBars} className="text-xl" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Sheet — full screen on phones for clean overlay */}
      {isMobileMenuOpen && (
        <>
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden fixed inset-0 bg-black/85 backdrop-blur-md z-[55]"
          />
          <div className="md:hidden fixed top-0 right-0 bottom-0 w-full sm:w-[85vw] sm:max-w-sm bg-velvet-surface sm:border-l border-velvet-border z-[60] shadow-2xl flex flex-col pt-safe">
            {/* Drawer header: profile (if logged in) or brand mark + close */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-velvet-border">
              {isAuthenticated && userProfile ? (
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden ring-2 ring-velvet-gold flex-shrink-0">
                    {userProfile.profileImage ? (
                      <Image src={userProfile.profileImage} alt="Profile" width={56} height={56} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-velvet-gold to-velvet-gold-light flex items-center justify-center">
                        <span className="text-velvet-black font-bold text-base">{getInitials(userProfile)}</span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-velvet-cream font-semibold text-sm truncate leading-tight">{getDisplayName(userProfile)}</p>
                    <p className="text-xs text-velvet-muted truncate leading-tight">{userProfile.email}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #c9a961, #e2c887)' }}>
                    <span className="font-black text-sm" style={{ color: '#0a0908' }}>V</span>
                  </div>
                  <span className="text-velvet-cream font-bold text-lg" style={{ fontFamily: 'serif' }}>Velvet</span>
                </div>
              )}
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close menu"
                className="ml-2 w-11 h-11 rounded-lg flex items-center justify-center text-velvet-cream hover:bg-velvet-gold/10 flex-shrink-0"
              >
                <FontAwesomeIcon icon={faXmark} className="text-xl" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="block">
                <div className="px-4 py-3 rounded-xl text-velvet-cream hover:bg-velvet-gold/10 transition text-base font-medium">Explore</div>
              </Link>
              <Link href="/events" onClick={() => setIsMobileMenuOpen(false)} className="block">
                <div className="px-4 py-3 rounded-xl text-velvet-cream hover:bg-velvet-gold/10 transition text-base font-medium">Events</div>
              </Link>
              <Link href="/restaurant-owner" onClick={() => setIsMobileMenuOpen(false)} className="block">
                <div className="px-4 py-3 rounded-xl text-velvet-cream hover:bg-velvet-gold/10 transition text-base font-medium">For Venues</div>
              </Link>
              {isAuthenticated && userProfile && (
                <Link href="/customer/profile" onClick={() => setIsMobileMenuOpen(false)} className="block">
                  <div className="px-4 py-3 rounded-xl text-velvet-cream hover:bg-velvet-gold/10 transition text-base font-medium flex items-center gap-3">
                    <FontAwesomeIcon icon={faUserEdit} className="text-velvet-gold" />
                    Profile Settings
                  </div>
                </Link>
              )}
            </nav>

            {!isAuthenticated && (
              <div className="p-4 border-t border-velvet-border space-y-2 pb-safe">
                <button
                  onClick={openLoginModal}
                  className="w-full py-3 rounded-xl font-medium text-velvet-cream border border-velvet-border hover:bg-velvet-gold/10 transition"
                >
                  Login
                </button>
                <button
                  onClick={openSignupModal}
                  className="w-full py-3 rounded-xl font-semibold bg-velvet-gold text-velvet-black hover:bg-velvet-gold-light transition shadow-lg shadow-velvet-gold/20"
                >
                  Create account
                </button>
              </div>
            )}
            {isAuthenticated && (
              <div className="p-4 border-t border-velvet-border pb-safe">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-red-400 border border-red-500/30 hover:bg-red-500/10 transition"
                >
                  <FontAwesomeIcon icon={faSignOutAlt} />
                  <span className="font-medium">Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={closeModal}
        openSignupModal={openSignupModal}
      />
      <SignupModal isOpen={isSignupModalOpen} onClose={closeModal} openLoginModal={openLoginModal} />
    </>
  );
}
