import { supabase } from '../config/supabase';

class Database {
  constructor() {
    // No local storage needed - everything is in Supabase now!
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

  async createUser(userData) {
    const { data, error } = await supabase
      .from('users')
      .insert([{
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        city: userData.city || '',
        organization: userData.organization || '',
        date_of_birth: userData.dateOfBirth,
        profession: userData.profession || ''
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating user:', error);
      return null;
    }
    return data;
  }

  async updateUser(id, updates) {
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
    const roundedHours = Math.round(hoursWorked * 4) / 4; // Round to nearest 15 minutes

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
    
    // Convert last_check_in strings back to Date objects for the frontend
    return data.map(user => ({
      ...user,
      last_check_in: user.last_check_in ? new Date(user.last_check_in) : null
    }));
  }

  // Donor operations
  async addDonation(userId, bagCount) {
    // Create donation record
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

    // Update user's total bags
    const user = await this.getUserById(userId);
    if (user) {
      const updatedUser = await this.updateUser(userId, {
        total_bags: user.total_bags + bagCount
      });
      return updatedUser;
    }
    return null;
  }

  // Analytics queries
  async getVolunteerHoursForDate(userId, date) {
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
  }

  async getDonationsForDate(date) {
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
  }

  // Hour adjustment operations
  async adjustUserHours(userId, newHours, reason) {
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
  
    // Log the adjustment (optional - for audit trail)
    const { error: logError } = await supabase
      .from('hour_adjustments')
      .insert([{
        user_id: userId,
        old_hours: data.total_hours,
        new_hours: newHours,
        reason: reason,
        adjusted_at: new Date().toISOString()
      }]);
  
    return data;
  }
  
  // Force check out operations
  async forceCheckOut(userId, reason) {
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
        notes: `Force check-out: ${reason}`
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

  // Session management operations
  async getUserSessions(userId) {
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
  }
  
  async updateSession(sessionId, updates) {
    // Recalculate hours if times are updated
    if (updates.check_in_time && updates.check_out_time) {
      const checkIn = new Date(updates.check_in_time);
      const checkOut = new Date(updates.check_out_time);
      const hoursWorked = (checkOut - checkIn) / (1000 * 60 * 60);
      updates.hours_worked = Math.round(hoursWorked * 4) / 4; // Round to 15 minutes
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
  
    // Recalculate user's total hours
    await this.recalculateUserHours(data.user_id);
    return data;
  }
  
  async deleteSession(sessionId) {
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
  
    // Recalculate user's total hours
    if (session.data) {
      await this.recalculateUserHours(session.data.user_id);
    }
    return true;
  }
  
  async recalculateUserHours(userId) {
    const sessions = await this.getUserSessions(userId);
    const totalHours = sessions.reduce((sum, session) => sum + (session.hours_worked || 0), 0);
    
    await this.updateUser(userId, { total_hours: totalHours });
    return totalHours;
  }
  
  // User deletion
  async deleteUser(userId) {
    // Delete related records first
    await supabase.from('donations').delete().eq('user_id', userId);
    await supabase.from('volunteer_sessions').delete().eq('user_id', userId);
    
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);
  
    if (error) {
      console.error('Error deleting user:', error);
      return false;
    }
    return true;
  }
  
  // Analytics by date range - WORKING VERSION
  async getAnalyticsByDateRange(startDate, endDate) {
    console.log(`📊 Getting analytics for ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`);
    
    // Get volunteer sessions in date range
    const { data: sessions, error: sessionsError } = await supabase
      .from('volunteer_sessions')
      .select('*')
      .gte('check_in_time', startDate)
      .lte('check_in_time', endDate);

    if (sessionsError) {
      console.error('Error getting sessions:', sessionsError);
    }

    // Get donations using timestamp column (we confirmed this works)
    const { data: donations, error: donationsError } = await supabase
      .from('donations')
      .select('bag_count, timestamp')
      .gte('timestamp', startDate)
      .lte('timestamp', endDate);

    if (donationsError) {
      console.error('Error getting donations:', donationsError);
    }

    // Calculate totals
    const totalHours = sessions?.reduce((sum, s) => sum + (s.hours_worked || 0), 0) || 0;
    const totalBags = donations?.reduce((sum, d) => sum + (d.bag_count || 0), 0) || 0;
    const uniqueVolunteers = new Set(sessions?.map(s => s.user_id)).size || 0;

    const result = {
      totalHours,
      totalBags,
      uniqueVolunteers,
      sessionCount: sessions?.length || 0,
      donationCount: donations?.length || 0
    };

    console.log(`✅ Found: ${result.sessionCount} sessions (${result.totalHours}h), ${result.donationCount} donations (${result.totalBags} bags)`);
    
    return result;
  }
}

// Create a single instance that the entire app will use
export const db = new Database();