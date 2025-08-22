

import { supabase } from '../config/supabase';
console.log('Environment check:');
console.log('REACT_APP_SUPABASE_URL:', process.env.REACT_APP_SUPABASE_URL);
console.log('REACT_APP_SUPABASE_ANON_KEY exists:', !!process.env.REACT_APP_SUPABASE_ANON_KEY);

class Database {
  constructor() {
    // Validate required environment variables
    if (!process.env.REACT_APP_SUPABASE_URL || !process.env.REACT_APP_SUPABASE_ANON_KEY) {
    throw new Error('Missing required environment variables');
  }
    this.currentStaffUser = null;
    this.autoCheckoutSettings = {
      enabled: true,
      startTime: '09:00',
      endTime: '18:00',
      timezone: 'America/Chicago'
    };
  }
async updateStaffPassword(newPassword) {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      throw new Error('Failed to update password: ' + error.message);
    }

    // Mark first login as complete
    if (this.currentStaffUser) {
      const { error: profileError } = await supabase
        .from('staff_profiles')
        .update({ first_login: false })
        .eq('id', this.currentStaffUser.id);

      if (profileError) {
        console.error('Error updating first_login flag:', profileError);
      } else {
        this.currentStaffUser.first_login = false;
        this.currentStaffUser.requiresPasswordChange = false;
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Password update error:', error);
    return { success: false, error: error.message };
  }
}
async authenticateStaff(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      throw new Error('Invalid credentials');
    }

    // Get staff profile
    const { data: profile, error: profileError } = await supabase
      .from('staff_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Not authorized as staff');
    }

    this.currentStaffUser = {
      ...profile,
      email: data.user.email,
      requiresPasswordChange: profile.first_login // Flag for first login
    };

    return this.currentStaffUser;
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
}

  getCurrentStaffUser() {
    return this.currentStaffUser;
  }

  logout() {
  supabase.auth.signOut();
  this.currentStaffUser = null;
}

  // User operations
  async findUsers(searchTerm) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(
        `name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.like.%${searchTerm}%,organization.ilike.%${searchTerm}%`
      );
    
    if (error) {
      console.error('Error searching users:', error);
      return [];
    }
    return data || [];
  }

  async getAllUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error getting users:', error);
      return [];
    }
    return data || [];
  }

  async getUserById(id) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error getting user:', error);
      return null;
    }
    return data;
  }

  validateUserInput(userData) {
  const errors = [];
  
  if (!userData.name || userData.name.length < 1 || userData.name.length > 100) {
    errors.push('Name must be 1-100 characters');
  }
  
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  if (!userData.email || !emailRegex.test(userData.email)) {
    errors.push('Invalid email format');
  }
  
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,20}$/;
  if (!userData.phone || !phoneRegex.test(userData.phone)) {
    errors.push('Invalid phone format');
  }
  
  return errors;
}

async createUser(userData) {
  // Validate input first
  const validationErrors = this.validateUserInput(userData);
  if (validationErrors.length > 0) {
    console.error('Validation failed:', validationErrors);
    throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .insert([{
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        city: userData.city || '',
        organization: userData.organization || '',
        date_of_birth: userData.dateOfBirth || null,
        profession: userData.profession || '',
        allow_communication: userData.allowCommunication || false,
        waiver_signed: userData.waiverSigned || false,
        parent_email: userData.parentEmail || null,
        is_minor: userData.isMinor || false,
        waiver_signed_at: userData.waiverSigned ? new Date().toISOString() : null,
        total_hours: 0,
        total_bags: 0,
        is_checked_in: false
      }])
      .select()
      .single();
           
    if (error) {
      console.error('Error creating user:', error);
      return null;
    }
    return data;
  } catch (error) {
    console.error('Error in createUser:', error);
    return null;
  }
}
  async updateUser(id, updates) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating user:', error);
        return null;
      }
      return data;
    } catch (error) {
      console.error('Error in updateUser:', error);
      return null;
    }
  }

  async deleteUser(userId) {
    try {
      await supabase.from('donations').delete().eq('user_id', userId);
      await supabase.from('volunteer_sessions').delete().eq('user_id', userId);
      await supabase.from('waiver_requests').delete().eq('user_id', userId);
      
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) {
        console.error('Error deleting user:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  // Volunteer operations
  async checkInVolunteer(userId) {
    const user = await this.updateUser(userId, {
      is_checked_in: true,
      last_check_in: new Date().toISOString()
    });
    return user;
  }

  async checkOutVolunteer(userId) {
    const user = await this.getUserById(userId);
    if (!user || !user.last_check_in) return null;

    const checkInTime = new Date(user.last_check_in);
    const checkOutTime = new Date();
    const hoursWorked = (checkOutTime - checkInTime) / (1000 * 60 * 60);
    const roundedHours = Math.round(hoursWorked * 4) / 4;

    // Create volunteer session record
    const { error: sessionError } = await supabase
      .from('volunteer_sessions')
      .insert([{
        user_id: userId,
        check_in_time: checkInTime.toISOString(),
        check_out_time: checkOutTime.toISOString(),
        hours_worked: roundedHours
      }]);

    if (sessionError) {
      console.error('Error creating volunteer session:', sessionError);
    }

    // Update user
    const updatedUser = await this.updateUser(userId, {
      is_checked_in: false,
      last_check_in: null,
      total_hours: user.total_hours + roundedHours
    });

    return updatedUser;
  }

  async getActiveVolunteers() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('is_checked_in', true);
    
    if (error) {
      console.error('Error getting active volunteers:', error);
      return [];
    }
    
    return data.map(user => ({
      ...user,
      last_check_in: user.last_check_in ? new Date(user.last_check_in) : null
    }));
  }

  async forceCheckOut(userId, reason) {
    try {
      const user = await this.getUserById(userId);
      if (!user || !user.is_checked_in) return null;

      const checkInTime = new Date(user.last_check_in);
      const checkOutTime = new Date();
      const hoursWorked = (checkOutTime - checkInTime) / (1000 * 60 * 60);
      const roundedHours = Math.round(hoursWorked * 4) / 4;

      // Create volunteer session record
      const { error: sessionError } = await supabase
        .from('volunteer_sessions')
        .insert([{
          user_id: userId,
          check_in_time: checkInTime.toISOString(),
          check_out_time: checkOutTime.toISOString(),
          hours_worked: roundedHours,
          notes: reason
        }]);

      if (sessionError) {
        console.error('Error creating volunteer session:', sessionError);
      }

      // Update user
      const updatedUser = await this.updateUser(userId, {
        is_checked_in: false,
        last_check_in: null,
        total_hours: user.total_hours + roundedHours
      });

      return updatedUser;
    } catch (error) {
      console.error('Error force checking out user:', error);
      return null;
    }
  }

  // Donor operations
  async addDonation(userId, bagCount) {
    try {
      const { error: donationError } = await supabase
        .from('donations')
        .insert([{
          user_id: userId,
          bag_count: bagCount
        }]);

      if (donationError) {
        console.error('Error creating donation:', donationError);
        return null;
      }

      const user = await this.getUserById(userId);
      if (user) {
        const updatedUser = await this.updateUser(userId, {
          total_bags: user.total_bags + bagCount
        });
        return updatedUser;
      }
      return null;
    } catch (error) {
      console.error('Error adding donation:', error);
      return null;
    }
  }

  // Session management operations
  async getUserSessions(userId) {
    try {
      const { data, error } = await supabase
        .from('volunteer_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('check_in_time', { ascending: false });
      
      if (error) {
        console.error('Error getting user sessions:', error);
        return [];
      }
      return data;
    } catch (error) {
      console.error('Error getting user sessions:', error);
      return [];
    }
  }

  async getUserSessionsInDateRange(userId, startDate, endDate) {
  try {
    const { data, error } = await supabase
      .from('volunteer_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('check_in_time', startDate)
      .lte('check_in_time', endDate)
      .order('check_in_time', { ascending: false });
    
    if (error) {
      console.error('Error getting user sessions in date range:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Error getting user sessions in date range:', error);
    return [];
  }
}

  async updateSession(sessionId, updates) {
    try {
      if (updates.check_in_time && updates.check_out_time) {
        const checkIn = new Date(updates.check_in_time);
        const checkOut = new Date(updates.check_out_time);
        const hoursWorked = (checkOut - checkIn) / (1000 * 60 * 60);
        updates.hours_worked = Math.round(hoursWorked * 4) / 4;
      }

      const { data, error } = await supabase
        .from('volunteer_sessions')
        .update(updates)
        .eq('id', sessionId)
        .select()
        .single();

      if (error) {
        console.error('Error updating session:', error);
        return null;
      }

      await this.recalculateUserHours(data.user_id);
      return data;
    } catch (error) {
      console.error('Error updating session:', error);
      return null;
    }
  }

  async deleteSession(sessionId) {
    try {
      const session = await supabase
        .from('volunteer_sessions')
        .select('user_id')
        .eq('id', sessionId)
        .single();

      const { error } = await supabase
        .from('volunteer_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) {
        console.error('Error deleting session:', error);
        return false;
      }

      if (session.data) {
        await this.recalculateUserHours(session.data.user_id);
      }
      return true;
    } catch (error) {
      console.error('Error deleting session:', error);
      return false;
    }
  }

  async recalculateUserHours(userId) {
    try {
      const sessions = await this.getUserSessions(userId);
      const totalHours = sessions.reduce((sum, session) => sum + (session.hours_worked || 0), 0);
      
      await this.updateUser(userId, { total_hours: totalHours });
      return totalHours;
    } catch (error) {
      console.error('Error recalculating user hours:', error);
      return 0;
    }
  }

  // Auto-checkout functionality
 async getAutoCheckoutSettings() {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('key', 'auto_checkout')
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error getting auto-checkout settings:', error);
      return this.autoCheckoutSettings;
    }
    
    return data ? JSON.parse(data.value) : this.autoCheckoutSettings;
  } catch (error) {
    console.error('Error parsing auto-checkout settings:', error);
    return this.autoCheckoutSettings;
  }
}

  // In database.js, update the updateAutoCheckoutSettings function:
async updateAutoCheckoutSettings(settings) {
  try {
    console.log('Attempting to save settings:', settings);
    
    const { data, error } = await supabase
      .from('system_settings')
      .upsert({
        key: 'auto_checkout',
        value: JSON.stringify(settings),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key'  // Specify which column to check for conflicts
      })
      .select()
      .single();
    
    console.log('Supabase response:', { data, error });
    
    if (error) {
      console.error('Supabase error details:', error);
      return false;
    }
    
    this.autoCheckoutSettings = settings;
    return true;
  } catch (error) {
    console.error('Exception in updateAutoCheckoutSettings:', error);
    return false;
  }
}

  async performAutoCheckout(reason = 'Auto-checkout: Office hours ended') {
    try {
      const settings = await this.getAutoCheckoutSettings();
      if (!settings.enabled) return { checkedOut: [], message: 'Auto-checkout is disabled' };

      const activeVolunteers = await this.getActiveVolunteers();
      const checkedOutUsers = [];

      for (const volunteer of activeVolunteers) {
        try {
          const updatedUser = await this.forceCheckOut(volunteer.id, reason);
          if (updatedUser) {
            checkedOutUsers.push(updatedUser);
          }
        } catch (error) {
          console.error(`Error auto-checking out user ${volunteer.id}:`, error);
        }
      }

      return {
        checkedOut: checkedOutUsers,
        message: `Auto-checked out ${checkedOutUsers.length} volunteers`
      };
    } catch (error) {
      console.error('Error performing auto-checkout:', error);
      return { checkedOut: [], message: 'Auto-checkout failed' };
    }
  }

async shouldRunAutoCheckout() {
  try {
    const settings = await this.getAutoCheckoutSettings();
    console.log('Auto-checkout settings:', settings);
    
    if (!settings.enabled) {
      console.log('Auto-checkout disabled');
      return false;
    }

    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const currentTime = now.toTimeString().slice(0, 5);
    
    console.log('Current day:', currentDay);
    console.log('Current time:', currentTime);
    console.log('Available schedule days:', Object.keys(settings.schedule || {}));
    
    const daySchedule = settings.schedule?.[currentDay];
    console.log('Today\'s schedule:', daySchedule);
    
    if (!daySchedule?.enabled) {
      console.log('Today is not enabled for auto-checkout');
      return false;
    }
    
    console.log(`Comparing ${currentTime} >= ${daySchedule.endTime}`);
    return currentTime >= daySchedule.endTime;
  } catch (error) {
    console.error('Error checking if auto-checkout should run:', error);
    return false;
  }
}

// Add this to database.js
async getAllSessionsInDateRange(startDate, endDate) {
  try {
    const { data, error } = await supabase
      .from('volunteer_sessions')
      .select('user_id, hours_worked')
      .gte('check_in_time', startDate)
      .lte('check_in_time', endDate);
    
    if (error) {
      console.error('Error getting all sessions in date range:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Error getting all sessions in date range:', error);
    return [];
  }
}

  // Analytics
  async getAnalyticsByDateRange(startDate, endDate) {
    try {
      const { data: donations, error: donationsError } = await supabase
        .from('donations')
        .select('bag_count, timestamp')
        .gte('timestamp', startDate)
        .lte('timestamp', endDate);

      const { data: sessions, error: sessionsError } = await supabase
        .from('volunteer_sessions')
        .select('*')
        .gte('check_in_time', startDate)
        .lte('check_in_time', endDate);

      const totalHours = sessions?.reduce((sum, s) => sum + (s.hours_worked || 0), 0) || 0;
      const totalBags = donations?.reduce((sum, d) => sum + (d.bag_count || 0), 0) || 0;
      const uniqueVolunteers = new Set(sessions?.map(s => s.user_id)).size || 0;

      return {
        totalHours,
        totalBags,
        uniqueVolunteers,
        sessionCount: sessions?.length || 0,
        donationCount: donations?.length || 0
      };
    } catch (error) {
      console.error('Error getting analytics by date range:', error);
      return {
        totalHours: 0,
        totalBags: 0,
        uniqueVolunteers: 0,
        sessionCount: 0,
        donationCount: 0
      };
    }
  }

  async getVolunteerHoursForDate(userId, date) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('volunteer_sessions')
        .select('hours_worked')
        .eq('user_id', userId)
        .gte('check_in_time', startOfDay.toISOString())
        .lte('check_in_time', endOfDay.toISOString());
      
      if (error) {
        console.error('Error getting volunteer hours:', error);
        return 0;
      }
      
      return data.reduce((total, session) => total + (session.hours_worked || 0), 0);
    } catch (error) {
      console.error('Error getting volunteer hours for date:', error);
      return 0;
    }
  }

  async getDonationsForDate(date) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('donations')
        .select('bag_count')
        .gte('timestamp', startOfDay.toISOString())
        .lte('timestamp', endOfDay.toISOString());
      
      if (error) {
        console.error('Error getting donations:', error);
        return 0;
      }
      
      return data.reduce((total, donation) => total + donation.bag_count, 0);
    } catch (error) {
      console.error('Error getting donations for date:', error);
      return 0;
    }
  }

  // Communication preferences
  async getUsersWithCommunicationPreferences() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('allow_communication', true);
      
      if (error) {
        console.error('Error getting users with communication preferences:', error);
        return [];
      }
      return data;
    } catch (error) {
      console.error('Error getting users with communication preferences:', error);
      return [];
    }
  }

  // Hour adjustment operations
  async adjustUserHours(userId, newHours, reason) {
    try {
      const user = await this.getUserById(userId);
      if (!user) return null;

      const { data, error } = await supabase
        .from('users')
        .update({ 
          total_hours: newHours 
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error adjusting user hours:', error);
        return null;
      }

      // Log the adjustment
      const { error: logError } = await supabase
        .from('hour_adjustments')
        .insert([{
          user_id: userId,
          old_hours: user.total_hours,
          new_hours: newHours,
          reason: reason,
          adjusted_at: new Date().toISOString(),
          adjusted_by: this.currentStaffUser?.username || 'staff'
        }]);

      if (logError) {
        console.error('Error logging hour adjustment:', logError);
      }

      return data;
    } catch (error) {
      console.error('Error adjusting user hours:', error);
      return null;
    }
  }

  // Add to database.js
async getVolunteersWithHoursInDateRange(startDate, endDate) {
  try {
    const { data: sessions, error } = await supabase
      .from('volunteer_sessions')
      .select('user_id, hours_worked')
      .gte('check_in_time', startDate)
      .lte('check_in_time', endDate);
    
    if (error) {
      console.error('Error getting volunteer sessions:', error);
      return {};
    }
    
    // Group sessions by user and sum hours
    const userHours = {};
    sessions.forEach(session => {
      const userId = session.user_id;
      userHours[userId] = (userHours[userId] || 0) + (session.hours_worked || 0);
    });
    
    return userHours;
  } catch (error) {
    console.error('Error getting volunteers with hours:', error);
    return {};
  }
}

  // Waiver system for minors
  async sendParentWaiverEmail(userId, parentEmail, volunteerName) {
    try {
      const waiverToken = this.generateWaiverToken();
      
      const { data, error } = await supabase
        .from('waiver_requests')
        .insert([{
          user_id: userId,
          parent_email: parentEmail,
          volunteer_name: volunteerName,
          token: waiverToken,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating waiver request:', error);
        return null;
      }

      const waiverLink = `${window.location.origin}/waiver/${waiverToken}`;
      console.log(`Waiver link for ${volunteerName}: ${waiverLink}`);
      
      return { success: true, waiverLink, token: waiverToken };
    } catch (error) {
      console.error('Error sending parent waiver email:', error);
      return null;
    }
  }

  generateWaiverToken() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  async getWaiverRequest(token) {
    try {
      const { data, error } = await supabase
        .from('waiver_requests')
        .select('*')
        .eq('token', token)
        .eq('status', 'pending')
        .single();

      if (error) {
        console.error('Error getting waiver request:', error);
        return null;
      }

      if (new Date(data.expires_at) < new Date()) {
        return { ...data, expired: true };
      }

      return data;
    } catch (error) {
      console.error('Error getting waiver request:', error);
      return null;
    }
  }

 // In your database.js file, replace the createStaffAccount method:



  async signParentWaiver(token, parentSignature) {
    try {
      const waiverRequest = await this.getWaiverRequest(token);
      if (!waiverRequest || waiverRequest.expired) return null;

      const { error: waiverError } = await supabase
        .from('waiver_requests')
        .update({
          status: 'signed',
          parent_signature: parentSignature,
          signed_at: new Date().toISOString()
        })
        .eq('token', token);

      if (waiverError) {
        console.error('Error updating waiver request:', waiverError);
        return null;
      }

      const updatedUser = await this.updateUser(waiverRequest.user_id, {
        waiver_signed: true,
        waiver_signed_at: new Date().toISOString(),
        parent_waiver_token: token
      });

      return updatedUser;
    } catch (error) {
      console.error('Error signing parent waiver:', error);
      return null;
    }
  }

  validateUserInput(userData) {
  const errors = [];
  
  if (!userData.name || userData.name.length < 1 || userData.name.length > 100) {
    errors.push('Name must be 1-100 characters');
  }
  
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  if (!userData.email || !emailRegex.test(userData.email)) {
    errors.push('Invalid email format');
  }
  
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,20}$/;
  if (!userData.phone || !phoneRegex.test(userData.phone)) {
    errors.push('Invalid phone format');
  }
  
  return errors;
}

}

export const db = new Database();