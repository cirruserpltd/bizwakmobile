import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
const { API_BASE_URL } = Constants.expoConfig.extra;

const UserProfile = () => {
  const { userId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const router = useRouter();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [nssfNumber, setNssfNumber] = useState('');
  const [nhifNumber, setNhifNumber] = useState('');

  useEffect(() => {
    getTokenAndFetchData();
  }, [userId]);

  const getTokenAndFetchData = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      if (!storedToken) {
        Alert.alert('Error', 'No authentication token found. Please login again.');
        router.push('/login');
        return;
      }
      setToken(storedToken);

      if (!userId) {
        const res = await fetch(`${API_BASE_URL}/api/users/currentUser`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        const data = await res.json();
        const u = Array.isArray(data?.payload) ? data.payload[0] : data?.payload;
        if (u) {
          setUser(u);
          setFullName(u.name || u.full_name || '');
          setEmail(u.email || '');
          setPhone(u.phone || '');
          setIdNumber(u.id_number || '');
          setNssfNumber(u.nssf_number || '');
          setNhifNumber(u.nhif_number || '');
        }
        return;
      }

      fetchUserData(storedToken);
    } catch (error) {
      console.error('Error getting token:', error);
    }
  };

  const fetchUserData = async (authToken) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('User data:', data);
        setUser(data.user);
        setFullName(data.user.name || data.user.full_name || '');
        setEmail(data.user.email || '');
        setPhone(data.user.phone || '');
        setIdNumber(data.user.id_number || '');
        setNssfNumber(data.user.nssf_number || '');
        setNhifNumber(data.user.nhif_number || '');
      } else {
        const errorData = await response.json();
        console.error('Fetch error:', errorData);
        Alert.alert('Error', 'Failed to fetch user data');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateInformation = async () => {
    if (!token) {
      Alert.alert('Error', 'No authentication token. Please login again.');
      return;
    }

    try {
      setUpdating(true);

      const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: fullName,
          email: email,
          phone: phone,
          id_number: idNumber,
          nssf_number: nssfNumber,
          nhif_number: nhifNumber,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Information updated successfully');
        fetchUserData(token);
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to update information');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
      console.error('Update error:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleResetPassword = () => {
    Alert.alert(
      'Reset Password',
      'Are you sure you want to reset the password for this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            if (!token) {
              Alert.alert('Error', 'No authentication token. Please login again.');
              return;
            }

            try {
              const response = await fetch(`${API_BASE_URL}/api/users/${userId}/reset-password`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
              });

              if (response.ok) {
                Alert.alert('Success', 'Password reset email sent');
              } else {
                Alert.alert('Error', 'Failed to reset password');
              }
            } catch (error) {
              Alert.alert('Error', 'Network error. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleSuspendUser = () => {
    Alert.alert(
      'Suspend User',
      'Are you sure you want to suspend this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Suspend',
          style: 'destructive',
          onPress: async () => {
            if (!token) {
              Alert.alert('Error', 'No authentication token. Please login again.');
              return;
            }

            try {
              const response = await fetch(`${API_BASE_URL}/api/users/${userId}/suspend`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
              });

              if (response.ok) {
                Alert.alert('Success', 'User suspended successfully');
                router.back();
              } else {
                Alert.alert('Error', 'Failed to suspend user');
              }
            } catch (error) {
              Alert.alert('Error', 'Network error. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person-circle-outline" size={120} color="#9CA3AF" />
          </View>
          <Text style={styles.userName}>{fullName || 'Admin'}</Text>
          <Text style={styles.userRole}>{user?.role || 'Administrator'}</Text>
          
          <View style={styles.contactInfo}>
            <View style={styles.contactItem}>
              <Ionicons name="mail-outline" size={16} color="#6B7280" />
              <Text style={styles.contactText}>{email}</Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="call-outline" size={16} color="#6B7280" />
              <Text style={styles.contactText}>{phone}</Text>
            </View>
          </View>
        </View>

        {/* Personal Information Form */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <View style={styles.row}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full name</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter full name"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter phone"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>ID Number</Text>
              <TextInput
                style={styles.input}
                value={idNumber}
                onChangeText={setIdNumber}
                placeholder="Enter ID number"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>NSSF Number</Text>
              <TextInput
                style={styles.input}
                value={nssfNumber}
                onChangeText={setNssfNumber}
                placeholder="Enter NSSF number"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>NHIF Number</Text>
              <TextInput
                style={styles.input}
                value={nhifNumber}
                onChangeText={setNhifNumber}
                placeholder="Enter NHIF number"
              />
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.updateButton}
            onPress={handleUpdateInformation}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.updateButtonText}>Update Information</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleResetPassword}
          >
            <Ionicons name="refresh-outline" size={20} color="#fff" />
            <Text style={styles.resetButtonText}>Reset password</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.suspendButton}
            onPress={handleSuspendUser}
          >
            <Ionicons name="lock-closed-outline" size={20} color="#fff" />
            <Text style={styles.suspendButtonText}>Suspend user</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 12 : 12,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 20,
  },
  contactInfo: {
    gap: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#6B7280',
  },
  formSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  inputContainer: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  actionSection: {
    padding: 16,
    gap: 12,
    marginBottom: 32,
  },
  updateButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  suspendButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  suspendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default UserProfile;