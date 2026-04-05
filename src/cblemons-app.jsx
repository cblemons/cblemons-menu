import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function CBLemonsApp() {
  // State
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [sections, setSections] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [allergens, setAllergens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    dishName: '',
    sectionId: '',
    description: '',
    ingredients: '',
    prepNotes: '',
    creationNotes: '',
    environment: 'dev',
    selectedAllergens: []
  });

  // Load data on mount
  useEffect(() => {
    loadLocations();
    loadAllergens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load sections when location changes
  useEffect(() => {
    if (selectedLocation) {
      loadSections(selectedLocation.id);
      loadDishes(selectedLocation.id);
    }
  }, [selectedLocation]);

  // Fetch locations
  const loadLocations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      setLocations(data || []);
      if (data && data.length > 0 && !selectedLocation) {
        setSelectedLocation(data[0]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch sections
  const loadSections = async (locationId) => {
    try {
      const { data, error } = await supabase
        .from('menu_sections')
        .select('*')
        .eq('location_id', locationId)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      setSections(data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  // Fetch dishes
  const loadDishes = async (locationId) => {
    try {
      const { data: sectionData, error: sectionError } = await supabase
        .from('menu_sections')
        .select('id')
        .eq('location_id', locationId);
      
      if (sectionError) throw sectionError;
      
      const sectionIds = sectionData.map(s => s.id);
      if (sectionIds.length === 0) {
        setDishes([]);
        return;
      }

      const { data, error } = await supabase
        .from('dishes')
        .select(`
          *,
          menu_sections(name),
          dish_allergens(
            allergens(id, name, description)
          )
        `)
        .in('section_id', sectionIds)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setDishes(data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  // Fetch allergens
  const loadAllergens = async () => {
    try {
      const { data, error } = await supabase
        .from('allergens')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      setAllergens(data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  // Create location
  const createLocation = async (e) => {
    e.preventDefault();
    const name = prompt('Enter location name (e.g., CB Lemons Seaside):');
    if (!name) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('locations')
        .insert([{ name, concept_type: 'TBD', description: '' }])
        .select();
      
      if (error) throw error;
      setLocations([...locations, data[0]]);
      setSelectedLocation(data[0]);
      alert('Location created!');
    } catch (err) {
      setError(err.message);
      alert('Error creating location: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Create section
  const createSection = async (e) => {
    e.preventDefault();
    if (!selectedLocation) {
      alert('Select a location first');
      return;
    }

    const sectionName = document.getElementById('section-name')?.value;
    const sectionDesc = document.getElementById('section-desc')?.value;
    
    if (!sectionName) {
      alert('Section name required');
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('menu_sections')
        .insert([{
          location_id: selectedLocation.id,
          name: sectionName,
          description: sectionDesc,
          display_order: sections.length
        }])
        .select();
      
      if (error) throw error;
      setSections([...sections, data[0]]);
      document.getElementById('section-name').value = '';
      document.getElementById('section-desc').value = '';
      alert('Section created!');
    } catch (err) {
      setError(err.message);
      alert('Error creating section: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Save dish
  const saveDish = async (e) => {
    e.preventDefault();
    if (!formData.sectionId) {
      alert('Select a section');
      return;
    }
    if (!formData.dishName) {
      alert('Dish name required');
      return;
    }

    try {
      setLoading(true);
      const { data: dishData, error: dishError } = await supabase
        .from('dishes')
        .insert([{
          section_id: formData.sectionId,
          environment: formData.environment,
          name: formData.dishName,
          description_public: formData.description,
          ingredients: formData.ingredients,
          prep_notes: formData.prepNotes,
          creation_notes: formData.creationNotes
        }])
        .select();
      
      if (dishError) throw dishError;
      
      const newDish = dishData[0];

      // Add allergens
      if (formData.selectedAllergens.length > 0) {
        const allergenRecords = formData.selectedAllergens.map(allergenId => ({
          dish_id: newDish.id,
          allergen_id: allergenId
        }));

        const { error: allergenError } = await supabase
          .from('dish_allergens')
          .insert(allergenRecords);
        
        if (allergenError) throw allergenError;
      }

      // Reload dishes
      await loadDishes(selectedLocation.id);
      
      // Reset form
      setFormData({
        dishName: '',
        sectionId: '',
        description: '',
        ingredients: '',
        prepNotes: '',
        creationNotes: '',
        environment: 'dev',
        selectedAllergens: []
      });
      
      alert('Dish saved!');
    } catch (err) {
      setError(err.message);
      alert('Error saving dish: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Add allergen
  const addAllergen = async (e) => {
    e.preventDefault();
    const allergenName = document.getElementById('allergen-name')?.value;
    const allergenDesc = document.getElementById('allergen-desc')?.value;
    
    if (!allergenName) {
      alert('Allergen name required');
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('allergens')
        .insert([{
          name: allergenName,
          description: allergenDesc
        }])
        .select();
      
      if (error) throw error;
      setAllergens([...allergens, data[0]]);
      document.getElementById('allergen-name').value = '';
      document.getElementById('allergen-desc').value = '';
      alert('Allergen added!');
    } catch (err) {
      setError(err.message);
      alert('Error adding allergen: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAllergenChange = (allergenId) => {
    setFormData(prev => ({
      ...prev,
      selectedAllergens: prev.selectedAllergens.includes(allergenId)
        ? prev.selectedAllergens.filter(id => id !== allergenId)
        : [...prev.selectedAllergens, allergenId]
    }));
  };

  // Dashboard stats
  const devDishCount = dishes.filter(d => d.environment === 'dev').length;
  const prodDishCount = dishes.filter(d => d.environment === 'production').length;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>CB Lemons Menu Manager</h1>
        <p style={styles.subtitle}>Develop, test, and launch menus across locations and environments</p>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.tabs}>
        {['dashboard', 'locations', 'menus', 'dishes', 'allergens', 'preview'].map(tab => (
          <button
            key={tab}
            style={{
              ...styles.tab,
              ...(currentTab === tab ? styles.tabActive : {})
            }}
            onClick={() => setCurrentTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* DASHBOARD */}
      {currentTab === 'dashboard' && (
        <div style={styles.content}>
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Locations</div>
              <div style={styles.statValue}>{locations.length}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Sections</div>
              <div style={styles.statValue}>{sections.length}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Dishes (Dev)</div>
              <div style={styles.statValue}>{devDishCount}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>In Production</div>
              <div style={styles.statValue}>{prodDishCount}</div>
            </div>
          </div>
        </div>
      )}

      {/* LOCATIONS */}
      {currentTab === 'locations' && (
        <div style={styles.content}>
          <div style={styles.sectionBox}>
            <h2 style={styles.sectionTitle}>Manage Locations</h2>
            <div style={styles.locationPills}>
              {locations.map(loc => (
                <button
                  key={loc.id}
                  style={{
                    ...styles.locationPill,
                    ...(selectedLocation?.id === loc.id ? styles.locationPillActive : {})
                  }}
                  onClick={() => setSelectedLocation(loc)}
                >
                  {loc.name}
                </button>
              ))}
              <button style={styles.buttonPrimary} onClick={createLocation}>
                + Add Location
              </button>
            </div>
            {selectedLocation && (
              <div style={styles.selectedLocationInfo}>
                <h3>{selectedLocation.name}</h3>
                <p>Active location for editing</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MENUS */}
      {currentTab === 'menus' && (
        <div style={styles.content}>
          <div style={styles.sectionBox}>
            <h2 style={styles.sectionTitle}>Menu Sections</h2>
            {selectedLocation ? (
              <>
                <p style={styles.selectedLocationText}>
                  <strong>Selected location:</strong> {selectedLocation.name}
                </p>
                <div style={styles.sectionsList}>
                  {sections.map(section => (
                    <div key={section.id} style={styles.card}>
                      <h3>{section.name}</h3>
                      <p>{section.description || 'No description'}</p>
                    </div>
                  ))}
                </div>
                <h3 style={styles.sectionSubtitle}>Create New Section</h3>
                <div style={styles.formGroup}>
                  <label>Section Name</label>
                  <input
                    id="section-name"
                    type="text"
                    placeholder="e.g., Ineffable Salads"
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label>Description</label>
                  <textarea
                    id="section-desc"
                    placeholder="Brief description of this section..."
                    style={styles.textarea}
                  />
                </div>
                <button style={styles.buttonPrimary} onClick={createSection}>
                  Create Section
                </button>
              </>
            ) : (
              <p>Select a location first</p>
            )}
          </div>
        </div>
      )}

      {/* DISHES */}
      {currentTab === 'dishes' && (
        <div style={styles.content}>
          <div style={styles.sectionBox}>
            <h2 style={styles.sectionTitle}>Add Dish</h2>
            
            <div style={styles.formGroup}>
              <label>Dish Name</label>
              <input
                type="text"
                placeholder="e.g., Lemon Preservation Salad"
                value={formData.dishName}
                onChange={(e) => setFormData({ ...formData, dishName: e.target.value })}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label>Section</label>
              <select
                value={formData.sectionId}
                onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
                style={styles.input}
              >
                <option value="">-- Select Section --</option>
                {sections.map(sec => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label>Description (Customer-facing)</label>
              <textarea
                placeholder="What makes this dish special?"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={styles.textarea}
              />
            </div>

            <div style={styles.formGroup}>
              <label>Ingredients</label>
              <textarea
                placeholder="Ingredient 1, Ingredient 2, ..."
                value={formData.ingredients}
                onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
                style={styles.textarea}
              />
            </div>

            <div style={styles.formGroup}>
              <label>Allergens</label>
              <div style={styles.allergenList}>
                {allergens.map(allergen => (
                  <label key={allergen.id} style={styles.allergenCheckbox}>
                    <input
                      type="checkbox"
                      checked={formData.selectedAllergens.includes(allergen.id)}
                      onChange={() => handleAllergenChange(allergen.id)}
                    />
                    {allergen.name}
                  </label>
                ))}
              </div>
            </div>

            <div style={styles.formGroup}>
              <label>Prep Notes (Dev only)</label>
              <textarea
                placeholder="Internal notes on preparation, sourcing, etc."
                value={formData.prepNotes}
                onChange={(e) => setFormData({ ...formData, prepNotes: e.target.value })}
                style={styles.textarea}
              />
            </div>

            <div style={styles.formGroup}>
              <label>Creation Notes (Dev only)</label>
              <textarea
                placeholder="Inspiration, iteration history, team notes..."
                value={formData.creationNotes}
                onChange={(e) => setFormData({ ...formData, creationNotes: e.target.value })}
                style={styles.textarea}
              />
            </div>

            <div style={styles.formGroup}>
              <label>Environment</label>
              <select
                value={formData.environment}
                onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                style={styles.input}
              >
                <option value="dev">Development</option>
                <option value="test">Test</option>
                <option value="preprod">Pre-production</option>
                <option value="production">Production</option>
              </select>
            </div>

            <div style={styles.buttonGroup}>
              <button style={styles.buttonPrimary} onClick={saveDish} disabled={loading}>
                {loading ? 'Saving...' : 'Save Dish'}
              </button>
            </div>
          </div>

          <div style={styles.sectionBox}>
            <h2 style={styles.sectionTitle}>Recent Dishes</h2>
            {dishes.length === 0 ? (
              <p>No dishes yet</p>
            ) : (
              dishes.slice(0, 5).map(dish => (
                <div key={dish.id} style={styles.card}>
                  <h3>{dish.name}</h3>
                  <p>{dish.description_public || 'No description'}</p>
                  <div style={styles.dishMeta}>
                    <span style={styles.badge}>{dish.environment}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ALLERGENS */}
      {currentTab === 'allergens' && (
        <div style={styles.content}>
          <div style={styles.sectionBox}>
            <h2 style={styles.sectionTitle}>Master Allergen List</h2>
            <p style={styles.allergenDesc}>
              Define allergens globally. Tag dishes with these to auto-generate strict disclosure warnings.
            </p>
            
            <div style={styles.allergenGrid}>
              {allergens.map(allergen => (
                <div key={allergen.id} style={styles.allergenCard}>
                  <div style={styles.allergenCardName}>{allergen.name}</div>
                  <div style={styles.allergenCardDesc}>{allergen.description}</div>
                </div>
              ))}
            </div>

            <h3 style={styles.sectionSubtitle}>Add New Allergen</h3>
            <div style={styles.formGroup}>
              <label>Allergen Name</label>
              <input
                id="allergen-name"
                type="text"
                placeholder="e.g., Sesame"
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label>Description</label>
              <textarea
                id="allergen-desc"
                placeholder="E.g., Common in tahini, hummus, Asian dressings..."
                style={styles.textarea}
              />
            </div>
            <button style={styles.buttonPrimary} onClick={addAllergen} disabled={loading}>
              {loading ? 'Adding...' : 'Add Allergen'}
            </button>
          </div>
        </div>
      )}

      {/* PREVIEW */}
      {currentTab === 'preview' && (
        <div style={styles.content}>
          <div style={styles.sectionBox}>
            <h2 style={styles.sectionTitle}>Public Menu Preview</h2>
            <p style={styles.previewDesc}>
              This is what customers see. Prep notes and internal metadata are hidden.
            </p>
            
            {selectedLocation && (
              <div style={styles.previewContainer}>
                <h1 style={styles.previewTitle}>{selectedLocation.name}</h1>
                <p style={styles.previewSubtitle}>{selectedLocation.description}</p>
                
                {sections.map(section => (
                  <div key={section.id} style={styles.previewSection}>
                    <h2 style={styles.previewSectionTitle}>{section.name}</h2>
                    {dishes
                      .filter(d => d.section_id === section.id && d.environment === 'production')
                      .map(dish => (
                        <div key={dish.id} style={styles.previewDish}>
                          <h3>{dish.name}</h3>
                          <p>{dish.description_public}</p>
                          {dish.dish_allergens && dish.dish_allergens.length > 0 && (
                            <div style={styles.previewAllergens}>
                              {dish.dish_allergens.map((da, idx) => (
                                <span key={idx} style={styles.previewAllergenTag}>
                                  ⚠️ {da.allergens.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '1.5rem',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    backgroundColor: '#f9f9f9',
    minHeight: '100vh'
  },
  header: {
    marginBottom: '2rem'
  },
  title: {
    fontSize: '28px',
    fontWeight: '600',
    margin: '0 0 0.5rem'
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    margin: '0'
  },
  tabs: {
    display: 'flex',
    gap: '0',
    borderBottom: '1px solid #ddd',
    marginBottom: '2rem'
  },
  tab: {
    padding: '12px 16px',
    fontSize: '14px',
    cursor: 'pointer',
    border: 'none',
    background: 'transparent',
    color: '#666',
    borderBottom: '2px solid transparent',
    transition: 'all 0.2s'
  },
  tabActive: {
    color: '#000',
    borderBottomColor: '#000'
  },
  content: {
    marginBottom: '2rem'
  },
  sectionBox: {
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '1.5rem',
    marginBottom: '1.5rem'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '1.5rem'
  },
  sectionSubtitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '1rem',
    marginTop: '2rem'
  },
  formGroup: {
    marginBottom: '1.5rem'
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontFamily: 'inherit',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  textarea: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontFamily: 'inherit',
    fontSize: '14px',
    minHeight: '100px',
    resize: 'vertical',
    boxSizing: 'border-box'
  },
  button: {
    padding: '0.75rem 1.5rem',
    fontSize: '14px',
    cursor: 'pointer',
    border: '1px solid #ddd',
    background: '#fff',
    borderRadius: '4px',
    color: '#000',
    transition: 'all 0.2s'
  },
  buttonPrimary: {
    padding: '0.75rem 1.5rem',
    fontSize: '14px',
    cursor: 'pointer',
    border: '1px solid #000',
    background: '#000',
    borderRadius: '4px',
    color: '#fff',
    transition: 'all 0.2s'
  },
  buttonGroup: {
    display: 'flex',
    gap: '0.75rem'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '1rem'
  },
  statCard: {
    background: '#f0f0f0',
    borderRadius: '8px',
    padding: '1rem',
    textAlign: 'center'
  },
  statLabel: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '0.5rem'
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '600'
  },
  locationPills: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.75rem',
    marginBottom: '1.5rem'
  },
  locationPill: {
    padding: '0.5rem 1rem',
    border: '1px solid #ddd',
    background: '#f9f9f9',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  locationPillActive: {
    background: '#000',
    color: '#fff',
    borderColor: '#000'
  },
  selectedLocationInfo: {
    background: '#f0f0f0',
    padding: '1.5rem',
    borderRadius: '8px',
    marginTop: '1rem'
  },
  selectedLocationText: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '1.5rem'
  },
  sectionsList: {
    marginBottom: '2rem'
  },
  card: {
    background: '#f9f9f9',
    border: '0.5px solid #ddd',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1rem'
  },
  allergenList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  allergenCheckbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '14px',
    cursor: 'pointer'
  },
  allergenDesc: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '1.5rem'
  },
  allergenGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem'
  },
  allergenCard: {
    background: '#f9f9f9',
    padding: '1rem',
    borderRadius: '8px',
    textAlign: 'center',
    border: '1px solid #ddd'
  },
  allergenCardName: {
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '0.5rem'
  },
  allergenCardDesc: {
    fontSize: '12px',
    color: '#666'
  },
  dishMeta: {
    marginTop: '0.75rem',
    fontSize: '12px'
  },
  badge: {
    display: 'inline-block',
    background: '#e0e0e0',
    padding: '0.25rem 0.75rem',
    borderRadius: '4px',
    fontSize: '12px'
  },
  error: {
    background: '#fee',
    color: '#c33',
    padding: '1rem',
    borderRadius: '4px',
    marginBottom: '1rem'
  },
  previewDesc: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '2rem'
  },
  previewContainer: {
    background: '#f9f9f9',
    padding: '2rem',
    borderRadius: '8px'
  },
  previewTitle: {
    fontSize: '28px',
    fontWeight: '600',
    marginBottom: '0.5rem',
    margin: '0 0 0.5rem'
  },
  previewSubtitle: {
    color: '#666',
    marginBottom: '2rem'
  },
  previewSection: {
    marginTop: '2rem',
    marginBottom: '2rem'
  },
  previewSectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '1.5rem'
  },
  previewDish: {
    background: '#fff',
    padding: '1.5rem',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    border: '1px solid #ddd'
  },
  previewAllergens: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    marginTop: '0.75rem'
  },
  previewAllergenTag: {
    background: '#fee',
    color: '#c33',
    padding: '0.25rem 0.75rem',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600'
  }
};
