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

  // Helper function to safely get nested values
  const safeGet = (obj, path, defaultValue = 'N/A') => {
    try {
      const value = path.split('.').reduce((current, key) => current?.[key], obj);
      return value !== null && value !== undefined && value !== '' ? value : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  // Helper function to convert yes/no strings to boolean
  const toBool = (value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return value.toLowerCase() === 'yes' || value === '1';
    }
    if (typeof value === 'number') return value === 1;
    return false;
  };

  // Helper function to get business type data
  const getBusinessData = () => {
    if (client?.business_types_data && Array.isArray(client.business_types_data) && client.business_types_data.length > 0) {
      return client.business_types_data[0];
    }
    return null;
  };

  // Helper function to get business checks
  const getBusinessChecks = () => {
    if (client?.business?.checks) {
      return client.business.checks;
    }
    return null;
  };

  if (loading) return <ActivityIndicator size="large" color="#007bff" style={{marginTop: 50}} />;
  if (!client) return <Text style={{textAlign: 'center', marginTop: 50}}>No client found.</Text>;

  const businessData = getBusinessData();
  const businessChecks = getBusinessChecks();

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
            <InfoRow label="ID:" value={client.id_no || 'N/A'} />
            <InfoRow label="Phone:" value={client.phone || 'N/A'} />
            <InfoRow label="Date of Birth:" value={client.dob || 'N/A'} />
            <InfoRow label="Gender:" value={client.gender || 'N/A'} />
            <InfoRow label="Branch:" value={client.branch || 'N/A'} />
            <InfoRow label="Team:" value={client.team || 'N/A'} />
            <InfoRow label="Joined:" value={client.joined_date || client.created_at || 'N/A'} />
          </View>

          <Text style={styles.documentsLabel}>DOCUMENTS</Text>
          <View style={styles.documentsRow}>
            <DocumentButton icon="eye" label="Profile" />
            <DocumentButton icon="eye" label="ID Front" />
            <DocumentButton icon="eye" label="ID Back" />
          </View>
        </View>

        {/* Dependents & Next of Kin Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="shield" size={20} color="#2196F3" />
            <Text style={styles.cardTitle}>Dependents & next of kin information</Text>
          </View>

          <Text style={styles.sectionTitle}>Next of Kin</Text>
          <InfoRow label="Name:" value={safeGet(client, 'next_of_kin.name')} />
          <InfoRow label="Phone:" value={safeGet(client, 'next_of_kin.phone')} />
          <InfoRow label="Physical location:" value={safeGet(client, 'next_of_kin.location')} />
          <InfoRow label="Relationship:" value={safeGet(client, 'next_of_kin.relationship')} />

          <Text style={styles.sectionTitle}>Dependents</Text>
          {client.dependents && client.dependents.length > 0 ? (
            client.dependents.map((dependent, index) => (
              <InfoRow key={index} label={`Dependent ${index + 1}:`} value={`${dependent.name || 'N/A'} (Age: ${dependent.age || 'N/A'})`} />
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

          <View style={styles.businessHeader}>
            <View style={styles.businessRow}>
              <Text style={styles.businessLabel}>Name: <Text style={styles.businessValue}>{businessData?.business_name || 'N/A'}</Text></Text>
              <Text style={styles.businessLabel}>Type: <Text style={styles.businessValue}>{businessData?.business_type || 'N/A'}</Text></Text>
            </View>
            <View style={styles.businessRow}>
              <Text style={styles.businessLabel}>Category: <Text style={styles.businessValue}>{businessData?.category || 'N/A'}</Text></Text>
              <Text style={styles.businessLabel}>Size: <Text style={styles.businessValue}>{businessData?.business_size || 'N/A'}</Text></Text>
            </View>
            <View style={styles.businessRow}>
              <Text style={styles.businessLabel}>Ownership: <Text style={styles.businessValue}>{businessData?.business_owner || businessData?.ownership || 'N/A'}</Text></Text>
              <View style={styles.badges}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Reg: {toBool(businessData?.is_registered) ? 'Yes' : 'No'}</Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Lic: {toBool(businessData?.is_licensed) ? 'Yes' : 'No'}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Stock Information */}
          {(client.perishable_stock?.length > 0 || client.non_perishable_stock?.length > 0) && (
            <View style={styles.stockSection}>
              <Text style={styles.stockTitle}>Stock Information</Text>
              
              {client.perishable_stock?.length > 0 && (
                <>
                  <Text style={styles.stockSubtitle}>Perishable Stock</Text>
                  {client.perishable_stock.map((stock, index) => (
                    <View key={index} style={styles.stockItem}>
                      <Text style={styles.stockItemText}>
                        {stock.stock_name || stock.product_name}: {stock.quantity || 'N/A'} {stock.unit_of_measure || ''} @ {stock.price_per_unit || 'N/A'}
                      </Text>
                    </View>
                  ))}
                </>
              )}

              {client.non_perishable_stock?.length > 0 && (
                <>
                  <Text style={styles.stockSubtitle}>Non-Perishable Stock</Text>
                  {client.non_perishable_stock.map((stock, index) => (
                    <View key={index} style={styles.stockItem}>
                      <Text style={styles.stockItemText}>
                        {stock.stock_name || stock.product_name}: {stock.quantity || 'N/A'} {stock.unit_of_measure || ''} @ {stock.price_per_unit || 'N/A'}
                      </Text>
                    </View>
                  ))}
                </>
              )}
            </View>
          )}

          {/* Business Checks with Yes/No text */}
          {businessChecks && (
            <>
              <Text style={styles.checksTitle}>Business Checks</Text>
              <YesNoItem text="Client forthcoming with info" value={businessChecks.client_fourthcoming_with_info || businessChecks.client_forthcoming} />
              <YesNoItem text="Active sales present" value={businessChecks.presence_of_active_sales || businessChecks.active_sales_activities} />
              <YesNoItem text="Premises well kept" value={businessChecks.premises_well_kept} />
              <YesNoItem text="Would you lend" value={businessChecks.would_you_lend || businessChecks.would_lend} />
              {businessChecks.any_other_biz_checks_info && businessChecks.any_other_biz_checks_info !== 'NONE' && (
                <View style={styles.additionalInfo}>
                  <Text style={styles.additionalInfoLabel}>Additional Info:</Text>
                  <Text style={styles.additionalInfoText}>{businessChecks.any_other_biz_checks_info}</Text>
                </View>
              )}
            </>
          )}

          <TouchableOpacity style={styles.viewPhotosButton}>
            <MaterialIcons name="photo-camera" size={20} color="#FF9800" />
            <Text style={styles.viewPhotosText}>View Business Photos</Text>
          </TouchableOpacity>
        </View>

        {/* Home Information Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="home" size={20} color="#2196F3" />
            <Text style={styles.cardTitle}>Home Information</Text>
          </View>

          <InfoRow label="Town:" value={client.home?.town || client.town || 'N/A'} />
          <InfoRow label="County:" value={client.home?.county || client.county || 'N/A'} />
          <InfoRow label="Village/estate:" value={client.home?.village || client.village || 'N/A'} />
          <InfoRow label="Building:" value={client.home?.building || client.building_name || 'N/A'} />
          <InfoRow label="Floor:" value={client.home?.floor || client.floor_no || 'N/A'} />
          <InfoRow label="Door No:" value={client.home?.door_no || client.door_no || 'N/A'} />

          <Text style={styles.sectionTitle}>HOUSEHOLD ITEMS (Chattels)</Text>
          {client.assets && client.assets.length > 0 ? (
            client.assets.map((item, index) => (
              <View key={index}>
                <View style={styles.householdItem}>
                  <View style={styles.householdInfo}>
                    <Text style={styles.householdName}>{item.asset_name || item.name || 'N/A'}</Text>
                    <Text style={styles.householdDetails}>Brand: {item.brand_model || item.brand || 'N/A'}</Text>
                    <Text style={styles.householdDetails}>Serial: {item.serial_no || 'N/A'}</Text>
                    <Text style={styles.householdDetails}>Condition: {item.condition || 'N/A'}</Text>
                  </View>
                  <MaterialIcons name="photo" size={24} color="#FF9800" />
                </View>
                <View style={styles.householdValue}>
                  <Text style={styles.valueLabel}>Value</Text>
                  <Text style={styles.valueAmount}>KSH {item.value || '0'}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.infoValue}>No household items recorded</Text>
          )}

          {/* Home Checks */}
          {client.additional_checks && (
            <>
              <Text style={styles.checksTitle}>Home Visit Checks</Text>
              <YesNoItem text="Client nervous" value={client.additional_checks.client_nervous || client.additional_checks.client_nervous_within_home} />
              <YesNoItem text="Proof of ownership" value={client.additional_checks.proof_ownership || client.additional_checks.item_persons_proving_ownership} />
              <YesNoItem text="Spouse aware" value={client.additional_checks.spouse_aware || client.additional_checks.spouse_awareness} />
              <YesNoItem text="Suspicious activity" value={client.additional_checks.suspicious_activity} />
              {client.additional_checks.any_other_home_checks_info && client.additional_checks.any_other_home_checks_info !== 'none' && (
                <View style={styles.additionalInfo}>
                  <Text style={styles.additionalInfoLabel}>Additional Info:</Text>
                  <Text style={styles.additionalInfoText}>{client.additional_checks.any_other_home_checks_info}</Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Agreements Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="description" size={20} color="#2196F3" />
            <Text style={styles.cardTitle}>Agreements</Text>
          </View>

          {client.agreements ? (
            <>
              <YesNoItem text="Willing to sign" value={client.agreements.willing_to_sign || client.agreements.client_willing_to_sign} />
              <YesNoItem text="Understands terms" value={client.agreements.understands_terms || client.agreements.client_understand_agreement} />
              <YesNoItem text="Aware of consequences" value={client.agreements.aware_consequences || client.agreements.client_understand_consequences} />
            </>
          ) : (
            <Text style={styles.infoValue}>No agreement information available</Text>
          )}

          {client.agreements?.guarantor && (
            <View style={styles.guarantorCard}>
              <Text style={styles.guarantorTitle}>Loan Guarantor</Text>
              <InfoRow label="Name:" value={client.agreements.guarantor.name || 'N/A'} />
              <InfoRow label="ID:" value={client.agreements.guarantor.id || client.agreements.guarantor.id_number || 'N/A'} />
              <InfoRow label="Phone:" value={client.agreements.guarantor.phone || 'N/A'} />
              <InfoRow label="Location:" value={client.agreements.guarantor.location || 'N/A'} />
              <View style={styles.maxAmountRow}>
                <Text style={styles.infoLabel}>Max Amount:</Text>
                <Text style={styles.maxAmountValue}>KSH {client.agreements.guarantor.max_amount || '0'}</Text>
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.viewAgreementButton}>
            <MaterialIcons name="description" size={20} color="#2196F3" />
            <Text style={styles.viewAgreementText}>View Agreement Documents</Text>
          </TouchableOpacity>
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
      <View style={[styles.yesNoBadge, isYes ? styles.yesBadge : styles.noBadge]}>
        <Text style={[styles.yesNoValue, isYes ? styles.yesText : styles.noText]}>
          {isYes ? 'Yes' : 'No'}
        </Text>
      </View>
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
  businessHeader: {
    backgroundColor: '#FFF8E1',
    padding: 12,
    borderRadius: 4,
    gap: 8,
    marginBottom: 12,
  },
  businessRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    color: '#000',
  },
  stockSection: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 4,
    marginBottom: 12,
  },
  stockTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  stockSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2196F3',
    marginTop: 8,
    marginBottom: 4,
  },
  stockItem: {
    paddingVertical: 4,
  },
  stockItemText: {
    fontSize: 13,
    color: '#000',
  },
  checksTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
    marginTop: 12,
    marginBottom: 12,
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
  yesNoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 50,
    alignItems: 'center',
  },
  yesBadge: {
    backgroundColor: '#E8F5E9',
  },
  noBadge: {
    backgroundColor: '#FFEBEE',
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
  additionalInfo: {
    backgroundColor: '#FFF8E1',
    padding: 12,
    borderRadius: 4,
    marginTop: 8,
  },
  additionalInfoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  additionalInfoText: {
    fontSize: 13,
    color: '#000',
  },
  viewPhotosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF8E1',
    paddingVertical: 12,
    borderRadius: 4,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  viewPhotosText: {
    color: '#FF9800',
    fontSize: 14,
    fontWeight: '600',
  },
  householdItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#FFF8E1',
    padding: 12,
    borderRadius: 4,
    marginBottom: 8,
  },
  householdInfo: {
    flex: 1,
  },
  householdName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  householdDetails: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  householdValue: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  valueLabel: {
    fontSize: 14,
    color: '#666',
  },
  valueAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF9800',
  },
  guarantorCard: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 4,
    marginTop: 12,
    gap: 8,
  },
  guarantorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
    marginBottom: 8,
  },
  maxAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#BBDEFB',
    marginTop: 4,
  },
  maxAmountValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
  },
  viewAgreementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E3F2FD',
    paddingVertical: 12,
    borderRadius: 4,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  viewAgreementText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600',
  },
});