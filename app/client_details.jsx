import React, { useEffect, useState } from 'react'
import { useLocalSearchParams } from 'expo-router';
import { View, Text, ActivityIndicator, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, Platform } from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
const { API_BASE_URL } = Constants.expoConfig.extra;

export default function ClientDataScreen() {
  const { member_id } = useLocalSearchParams();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClientDetails = async () => {
      try {
        const token = await AsyncStorage.getItem('token'); 
        if (!token) {
          console.warn('No token found');
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/mobile/clients/${member_id}/details`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        });

        const text = await response.text(); 
        console.log("Raw response text:", text);

        try {
          const data = JSON.parse(text);
          console.log("Fetched client data:", JSON.stringify(data, null, 2));
          setClient(data.client);
        } catch (parseError) {
          console.error("Failed to parse JSON:", parseError);
        }

      } catch (err) {
        console.error("Network or fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (member_id) fetchClientDetails();
  }, [member_id]);

  const safeGet = (obj, path, defaultValue = 'N/A') => {
    try {
      const value = path.split('.').reduce((current, key) => current?.[key], obj);
      return value !== null && value !== undefined && value !== '' ? value : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const toBool = (value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return value.toLowerCase() === 'yes' || value === '1';
    }
    if (typeof value === 'number') return value === 1;
    return false;
  };

  const getBusinessData = () => {
    if (client?.business_types_data && Array.isArray(client.business_types_data) && client.business_types_data.length > 0) {
      return client.business_types_data[0];
    }
    return null;
  };

  if (loading) return <ActivityIndicator size="large" color="#007bff" style={{marginTop: 50}} />;
  if (!client) return <Text style={{textAlign: 'center', marginTop: 50}}>No client found.</Text>;

  const businessData = getBusinessData();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2196F3" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity>
            <Feather name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Client Data</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileIcon}>
            <Feather name="user" size={40} color="#666" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{client.name || 'N/A'}</Text>
            <Text style={styles.profileId}>ID: {client.id_no || client.member_id || 'N/A'}</Text>
          </View>
          <TouchableOpacity style={styles.editButton}>
            <Feather name="edit" size={16} color="white" />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Personal Information Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Feather name="user" size={20} color="#2196F3" />
            <Text style={styles.cardTitle}>Personal Information</Text>
          </View>
          
          <View style={styles.infoGrid}>
            <InfoRow label="ID NO:" value={client.id_no || 'N/A'} />
            <InfoRow label="Phone:" value={client.phone || 'N/A'} />
            <InfoRow label="Alt Phone:" value={client.alt_phone_no || 'N/A'} />
            <InfoRow label="DOB:" value={client.dob || 'N/A'} />
            <InfoRow label="Gender:" value={client.gender || 'N/A'} />
            <InfoRow label="Marital status:" value={client.marital_status || 'N/A'} />
            <InfoRow label="Branch:" value={client.branch || 'N/A'} />
            <InfoRow label="Team:" value={client.team || 'N/A'} />
            <InfoRow label="Date Joined:" value={client.joined_date || client.created_at || 'N/A'} />
          </View>

          <Text style={styles.documentsLabel}>DOCUMENTS</Text>
          <View style={styles.documentsRow}>
            <DocumentButton icon="eye" label="Profile" />
            <DocumentButton icon="eye" label="ID Front" />
            <DocumentButton icon="eye" label="ID Back" />
            <DocumentButton icon="eye" label="Signature" />
          </View>
        </View>

        {/* Dependents & Next of Kin Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="people" size={20} color="#2196F3" />
            <Text style={styles.cardTitle}>Dependents & next of kin information</Text>
          </View>

          <Text style={styles.sectionTitle}>Next of kin</Text>
          <InfoRow label="Name:" value={safeGet(client, 'next_of_kin.name')} />
          <InfoRow label="Phone:" value={safeGet(client, 'next_of_kin.phone')} />
          <InfoRow label="Physical location:" value={safeGet(client, 'next_of_kin.location')} />
          <InfoRow label="Relationship:" value={safeGet(client, 'next_of_kin.relationship')} />

          <Text style={styles.sectionTitle}>Dependents</Text>
          {client.dependents && client.dependents.length > 0 && client.dependents[0].name ? (
            client.dependents.map((dependent, index) => (
              <View key={index} style={styles.dependentRow}>
                <InfoRow label="Name:" value={dependent.name || 'N/A'} />
                <InfoRow label="Age:" value={dependent.age || 'N/A'} />
                <InfoRow label="Relationship:" value={dependent.relationship || 'N/A'} />
              </View>
            ))
          ) : (
            <Text style={styles.infoValue}>No dependents</Text>
          )}
        </View>

        {/* Business Information Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="business-center" size={20} color="#2196F3" />
            <Text style={styles.cardTitle}>Business Information</Text>
          </View>

          <Text style={styles.sectionSubtitle}>Business type and Size</Text>
          <View style={styles.businessHeader}>
            <View style={styles.businessRow}>
              <Text style={styles.businessLabel}>Type: <Text style={styles.businessValue}>{businessData?.business_type || 'N/A'}</Text></Text>
              <Text style={styles.businessLabel}>Category: <Text style={styles.businessValue}>{businessData?.category || 'N/A'}</Text></Text>
            </View>
            <View style={styles.businessRow}>
              <Text style={styles.businessLabel}>Size: <Text style={styles.businessValue}>{businessData?.business_size || 'N/A'}</Text></Text>
              <Text style={styles.businessLabel}>Ownership: <Text style={styles.businessValue}>{businessData?.business_owner || 'N/A'}</Text></Text>
            </View>
            <View style={styles.businessRow}>
              <View style={styles.badges}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Registration: {toBool(businessData?.is_registered) ? 'Yes' : 'No'}</Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Licence: {toBool(businessData?.is_licensed) ? 'Yes' : 'No'}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Perishable Stock */}
          {client.perishable_stock?.length > 0 && client.perishable_stock[0].stock_name && (
            <View style={styles.stockSection}>
              <Text style={styles.stockTitle}>Perishable Stock</Text>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, {flex: 2}]}>Name</Text>
                <Text style={[styles.tableHeaderText, {flex: 1}]}>Quantity</Text>
                <Text style={[styles.tableHeaderText, {flex: 1}]}>Unit</Text>
                <Text style={[styles.tableHeaderText, {flex: 1}]}>Price per unit</Text>
                <Text style={[styles.tableHeaderText, {flex: 1}]}>Value</Text>
              </View>
              {client.perishable_stock.map((stock, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, {flex: 2}]}>{stock.stock_name || 'N/A'}</Text>
                  <Text style={[styles.tableCell, {flex: 1}]}>{stock.quantity || 'N/A'}</Text>
                  <Text style={[styles.tableCell, {flex: 1}]}>{stock.unit_of_measure || 'N/A'}</Text>
                  <Text style={[styles.tableCell, {flex: 1}]}>{stock.price_per_unit || 'N/A'}</Text>
                  <Text style={[styles.tableCell, {flex: 1}]}>{stock.value || 'N/A'}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Non-Perishable Stock */}
          {client.non_perishable_stock?.length > 0 && client.non_perishable_stock[0].stock_name && (
            <View style={styles.stockSection}>
              <Text style={styles.stockTitle}>Non-Perishable Stock</Text>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, {flex: 2}]}>Name</Text>
                <Text style={[styles.tableHeaderText, {flex: 1}]}>Quantity</Text>
                <Text style={[styles.tableHeaderText, {flex: 1}]}>Unit</Text>
                <Text style={[styles.tableHeaderText, {flex: 1}]}>Price per unit</Text>
                <Text style={[styles.tableHeaderText, {flex: 1}]}>Value</Text>
              </View>
              {client.non_perishable_stock.map((stock, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, {flex: 2}]}>{stock.stock_name || 'N/A'}</Text>
                  <Text style={[styles.tableCell, {flex: 1}]}>{stock.quantity || 'N/A'}</Text>
                  <Text style={[styles.tableCell, {flex: 1}]}>{stock.unit_of_measure || 'N/A'}</Text>
                  <Text style={[styles.tableCell, {flex: 1}]}>{stock.price_per_unit || 'N/A'}</Text>
                  <Text style={[styles.tableCell, {flex: 1}]}>{stock.value || 'N/A'}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Business Asset items */}
          {client.asset_items?.length > 0 && client.asset_items[0].asset_name && (
            <View style={styles.stockSection}>
              <Text style={styles.stockTitle}>Business Asset items</Text>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, {flex: 2}]}>Name</Text>
                <Text style={[styles.tableHeaderText, {flex: 1}]}>Quantity</Text>
                <Text style={[styles.tableHeaderText, {flex: 1}]}>Price per unit</Text>
                <Text style={[styles.tableHeaderText, {flex: 1}]}>Value</Text>
                <Text style={[styles.tableHeaderText, {flex: 1}]}>Image</Text>
              </View>
              {client.asset_items.map((asset, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, {flex: 2}]}>{asset.asset_name || 'N/A'}</Text>
                  <Text style={[styles.tableCell, {flex: 1}]}>{asset.quantity || 'N/A'}</Text>
                  <Text style={[styles.tableCell, {flex: 1}]}>{asset.price_per_unit || 'N/A'}</Text>
                  <Text style={[styles.tableCell, {flex: 1}]}>{asset.value || 'N/A'}</Text>
                  <View style={[styles.tableCell, {flex: 1}]}>
                    <MaterialIcons name="photo" size={20} color="#2196F3" />
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Business Checks */}
          <Text style={styles.checksTitle}>Business Checks</Text>
          <YesNoItem text="Client forthcoming with info" value={client.business?.checks?.forthcoming} />
          <YesNoItem text="Presence of active sales" value={client.business?.checks?.active_sales} />
          <YesNoItem text="Premises well kept" value={client.business?.checks?.premises_kept} />
          <YesNoItem text="Would you lend" value={client.business?.checks?.would_lend} />

          <Text style={styles.sectionSubtitle}>Business Images</Text>
          <TouchableOpacity style={styles.viewPhotosButton}>
            <MaterialIcons name="photo-camera" size={20} color="#2196F3" />
            <Text style={styles.viewPhotosText}>Business Front View Picture</Text>
          </TouchableOpacity>
        </View>

        {/* Home Information Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="home" size={20} color="#2196F3" />
            <Text style={styles.cardTitle}>Home Information</Text>
          </View>

          <Text style={styles.sectionSubtitle}>Home Details</Text>
          <InfoRow label="Town:" value={client.home?.town || client.town || 'N/A'} />
          <InfoRow label="County:" value={client.home?.county || client.county || 'N/A'} />
          <InfoRow label="Village/Estate:" value={client.home?.village || client.village || 'N/A'} />
          <InfoRow label="Name Of Building:" value={client.home?.building || client.building_name || 'N/A'} />
          <InfoRow label="Floor:" value={client.home?.floor || client.floor_no || 'N/A'} />
          <InfoRow label="Door No:" value={client.home?.door_no || client.door_no || 'N/A'} />
          <InfoRow label="Detailed Location Description:" value={client.detailed_address || 'N/A'} />
          <InfoRow label="GPRS:" value={client.gprs_coordinates || 'N/A'} />

          {/* Chattels */}
          <Text style={styles.sectionSubtitle}>Chattels (Household items pledged as securities)</Text>
          {client.home?.household_items?.length > 0 && client.home.household_items[0].name ? (
            <View style={styles.stockSection}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, {flex: 2}]}>Name</Text>
                <Text style={[styles.tableHeaderText, {flex: 1.5}]}>Brand/Model</Text>
                <Text style={[styles.tableHeaderText, {flex: 1.5}]}>Serial No</Text>
                <Text style={[styles.tableHeaderText, {flex: 1.5}]}>Description</Text>
                <Text style={[styles.tableHeaderText, {flex: 1}]}>Condition</Text>
                <Text style={[styles.tableHeaderText, {flex: 1}]}>Value</Text>
              </View>
              {client.home.household_items.map((item, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, {flex: 2}]}>{item.name || 'N/A'}</Text>
                  <Text style={[styles.tableCell, {flex: 1.5}]}>{item.brand || 'N/A'}</Text>
                  <Text style={[styles.tableCell, {flex: 1.5}]}>{item.serial || 'N/A'}</Text>
                  <Text style={[styles.tableCell, {flex: 1.5}]}>{item.description || 'N/A'}</Text>
                  <Text style={[styles.tableCell, {flex: 1}]}>{item.condition || 'N/A'}</Text>
                  <Text style={[styles.tableCell, {flex: 1}]}>{item.value || 'N/A'}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.infoValue}>No household items recorded</Text>
          )}

          {/* Home Checks */}
          <Text style={styles.checksTitle}>Home Checks</Text>
          <YesNoItem text="Client nervous within home" value={client.additional_checks?.client_nervous} />
          <YesNoItem text="Presence proving home ownership" value={client.additional_checks?.proof_ownership} />
          <YesNoItem text="Description of the proof" value={client.additional_checks?.proof_description} />
          <YesNoItem text="Spouse awareness of intention to take loan" value={client.additional_checks?.spouse_aware} />
          <YesNoItem text="Suspicious activity" value={client.additional_checks?.suspicious_activity} />

          <Text style={styles.sectionSubtitle}>Home Images</Text>
          <TouchableOpacity style={styles.viewPhotosButton}>
            <MaterialIcons name="photo-camera" size={20} color="#2196F3" />
            <Text style={styles.viewPhotosText}>View Home Images</Text>
          </TouchableOpacity>
        </View>

        {/* Agreements Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="description" size={20} color="#2196F3" />
            <Text style={styles.cardTitle}>Agreements</Text>
          </View>

          <Text style={styles.sectionSubtitle}>Agreement and Afidavit Checks</Text>
          {client.agreements ? (
            <>
              <View style={styles.agreementChecks}>
                <View style={styles.agreementCheckRow}>
                  <Text style={styles.agreementCheckLabel}>Willing to sign the agreement:</Text>
                  <Text style={styles.agreementCheckValue}>{toBool(client.agreements.willing_to_sign) ? 'yes' : 'no'}</Text>
                </View>
                <View style={styles.agreementCheckRow}>
                  <Text style={styles.agreementCheckLabel}>Understand the agreement:</Text>
                  <Text style={styles.agreementCheckValue}>{toBool(client.agreements.understands_terms) ? 'yes' : 'no'}</Text>
                </View>
                <View style={styles.agreementCheckRow}>
                  <Text style={styles.agreementCheckLabel}>Aware of the consequences of agreement breach:</Text>
                  <Text style={styles.agreementCheckValue}>{toBool(client.agreements.aware_consequences) ? 'yes' : 'no'}</Text>
                </View>
              </View>
            </>
          ) : (
            <Text style={styles.infoValue}>No agreement information available</Text>
          )}

          <Text style={styles.sectionSubtitle}>Agreement Images</Text>
          <TouchableOpacity style={styles.viewPhotosButton}>
            <MaterialIcons name="photo-camera" size={20} color="#2196F3" />
            <Text style={styles.viewPhotosText}>Client Agreement (Affidavit)</Text>
          </TouchableOpacity>

          {/* Loan Guarantor Declaration */}
          {client.agreements?.guarantor && client.agreements.guarantor.name && (
          <>
            <Text style={styles.sectionSubtitle}>Loan Guarantor Declaration</Text>

            {/* Wrap the table in a horizontal ScrollView */}
            <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
              <View style={styles.guarantorTable}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderText, {flex: 1.5, marginRight: 10}]}>Name</Text>
                  <Text style={[styles.tableHeaderText, {flex: 1, marginRight: 10}]}>Id No.</Text>
                  <Text style={[styles.tableHeaderText, {flex: 1, marginRight: 10}]}>Phone No.</Text>
                  <Text style={[styles.tableHeaderText, {flex: 1.5, marginRight: 10}]}>Residential</Text>
                  <Text style={[styles.tableHeaderText, {flex: 1, marginRight: 10}]}>Landmark</Text>
                  <Text style={[styles.tableHeaderText, {flex: 1.5, marginRight: 10}]}>Employment/Business Location</Text>
                  <Text style={[styles.tableHeaderText, {flex: 1}]}>Maximum Amount</Text>
                </View>

                <View style={styles.tableRow}>
                  <Text style={[styles.tableCell, {flex: 1.5}]}>{client.agreements.guarantor.name || 'N/A'}</Text>
                  <Text style={[styles.tableCell, {flex: 1}]}>{client.agreements.guarantor.id || 'N/A'}</Text>
                  <Text style={[styles.tableCell, {flex: 1}]}>{client.agreements.guarantor.phone || 'N/A'}</Text>
                  <Text style={[styles.tableCell, {flex: 1.5}]}>{client.agreements.guarantor.location || 'N/A'}</Text>
                  <Text style={[styles.tableCell, {flex: 1}]}>{client.agreements.guarantor.landmark || 'N/A'}</Text>
                  <Text style={[styles.tableCell, {flex: 1.5}]}>{client.agreements.guarantor.business_location || 'N/A'}</Text>
                  <Text style={[styles.tableCell, {flex: 1}]}>{client.agreements.guarantor.max_amount || 'N/A'}</Text>
                </View>
              </View>
            </ScrollView>

            <Text style={styles.sectionSubtitle}>Agreement Images</Text>
            <TouchableOpacity style={styles.viewPhotosButton}>
              <MaterialIcons name="photo-camera" size={20} color="#2196F3" />
              <Text style={styles.viewPhotosText}>Guarantor Agreement</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.viewPhotosButton}>
              <MaterialIcons name="photo-camera" size={20} color="#2196F3" />
              <Text style={styles.viewPhotosText}>Guarantor Signature Img</Text>
            </TouchableOpacity>
          </>
        )}

        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

// Helper Components
const InfoRow = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const DocumentButton = ({ icon, label }) => (
  <TouchableOpacity style={styles.documentButton}>
    <Feather name={icon} size={18} color="#2196F3" />
    <Text style={styles.documentButtonText}>{label}</Text>
  </TouchableOpacity>
);

const YesNoItem = ({ text, value }) => {
  const isYes = typeof value === 'boolean' ? value : 
                typeof value === 'string' ? value.toLowerCase() === 'yes' || value === '1' :
                typeof value === 'number' ? value === 1 : false;
  
  return (
    <View style={styles.yesNoItem}>
      <Text style={styles.yesNoText}>{text}</Text>
      <Text style={[styles.yesNoValue, isYes ? styles.yesText : styles.noText]}>
        {isYes ? 'yes' : 'no'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  profileIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  profileId: {
    fontSize: 14,
    color: '#666',
  },
  editButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  editButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  card: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#2196F3',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
  },
  infoGrid: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  documentsLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  documentsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  documentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
  },
  documentButtonText: {
    color: '#2196F3',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dependentRow: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 4,
    marginBottom: 8,
  },
  businessHeader: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 4,
    gap: 8,
    marginBottom: 12,
  },
  businessRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  businessLabel: {
    fontSize: 13,
    color: '#666',
  },
  businessValue: {
    color: '#000',
    fontWeight: '600',
  },
  badges: {
    flexDirection: 'row',
    gap: 12,
  },
  badge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '600',
  },
  stockSection: {
    marginVertical: 12,
  },
  stockTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tableCell: {
    fontSize: 12,
    color: '#000',
  },
  checksTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  yesNoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  yesNoText: {
    fontSize: 14,
    color: '#000',
    flex: 1,
  },
  yesNoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  yesText: {
    color: '#4CAF50',
  },
  noText: {
    color: '#F44336',
  },
  viewPhotosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f9f9f9',
    paddingVertical: 12,
    borderRadius: 4,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  viewPhotosText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '500',
  },
  agreementChecks: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 4,
    marginBottom: 12,
  },
  agreementCheckRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  agreementCheckLabel: {
    fontSize: 13,
    color: '#000',
    flex: 1,
  },
  agreementCheckValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2196F3',
  },
  guarantorTable: {
    marginVertical: 12,
  },
})