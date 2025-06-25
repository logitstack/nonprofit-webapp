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
        date_of_birth: userData.dateOfBirth  // Changed from age
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

  // Analytics queries (for future staff dashboard)
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
}

// Create a single instance that the entire app will use
export const db = new Database();