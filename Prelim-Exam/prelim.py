import streamlit as st
import pandas as pd
import time

# --- 1. SORTING ALGORITHMS ---

def bubble_sort(arr, key, progress_bar=None):
    n = len(arr)
    # Update UI roughly every 5% to avoid slowing down the loop
    update_step = max(1, n // 20)
    
    for i in range(n):
        if progress_bar and i % update_step == 0:
            progress_bar.progress(i / n, text=f"Bubble Sort: {int((i/n)*100)}%")

        swapped = False
        for j in range(0, n - i - 1):
            if arr[j][key] > arr[j + 1][key]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
                swapped = True
        if not swapped:
            break
            
    if progress_bar: progress_bar.progress(1.0, text="Finished!")
    return arr

def insertion_sort(arr, key, progress_bar=None):
    n = len(arr)
    update_step = max(1, n // 20)
    
    for i in range(1, n):
        if progress_bar and i % update_step == 0:
            progress_bar.progress(i / n, text=f"Insertion Sort: {int((i/n)*100)}%")

        current = arr[i]
        j = i - 1
        while j >= 0 and arr[j][key] > current[key]:
            arr[j + 1] = arr[j]
            j -= 1
        arr[j + 1] = current
        
    if progress_bar: progress_bar.progress(1.0, text="Finished!")
    return arr

def merge_sort_wrapper(arr, key, progress_bar=None):
    if progress_bar:
        progress_bar.progress(0.1, text="Merge Sort: Dividing and Conquering...")
    result = _merge_sort_recursive(arr, key)
    if progress_bar:
        progress_bar.progress(1.0, text="Finished!")
    return result

def _merge_sort_recursive(arr, key):
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left = _merge_sort_recursive(arr[:mid], key)
    right = _merge_sort_recursive(arr[mid:], key)
    return merge(left, right, key)

def merge(left, right, key):
    result = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i][key] <= right[j][key]:
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1
    result.extend(left[i:])
    result.extend(right[j:])
    return result

# --- 2. STREAMLIT APP UI ---

st.set_page_config(page_title="Sorting Stress Test", layout="wide")
st.title("⚡ Sorting Algorithm Stress Test")

# --- SIDEBAR: DATA LOADING ---
st.sidebar.header("1. Data Loading")
uploaded_file = st.sidebar.file_uploader("Upload CSV", type=["csv"])

df_original = None

# Logic: Only load if user uploads a file
if uploaded_file:
    try:
        df_original = pd.read_csv(uploaded_file)
        # Ensure ID is numeric if it exists
        if 'ID' in df_original.columns:
            df_original['ID'] = pd.to_numeric(df_original['ID'], errors='coerce').fillna(0).astype(int)
        st.sidebar.success(f"Uploaded: {len(df_original)} rows")
    except Exception as e:
        st.sidebar.error(f"Error loading file: {e}")
else:
    st.info("👋 Please upload a CSV file to begin.")

# --- SIDEBAR: PARAMETERS ---
st.sidebar.header("2. Test Parameters")

if df_original is not None:
    # 1. Column Selection
    cols = df_original.columns.tolist()
    sort_col = st.sidebar.selectbox("Sort By", cols, index=0 if 'ID' in cols else 0)
    
    # 2. Algorithm Selection
    sort_algo = st.sidebar.selectbox("Algorithm", ["Merge Sort", "Insertion Sort", "Bubble Sort"])
    
    st.sidebar.markdown("---")
    st.sidebar.write("**Row Selection (N):**")
    
    # 3. Hybrid Row Selection (Presets + Custom)
    mode = st.sidebar.radio("Select Mode:", ["Presets", "Custom Input"], horizontal=True)
    
    dataset_size = 1000 # Default
    max_possible = len(df_original)

    if mode == "Presets":
        preset_choice = st.sidebar.selectbox(
            "Choose Size:", 
            ["1,000 Rows", "10,000 Rows", "100,000 Rows"]
        )
        # Parse the number from string
        try:
            val = int(preset_choice.replace(" Rows", "").replace(",", ""))
            dataset_size = val
        except:
            dataset_size = 1000
    else:
        # Custom Mode
        dataset_size = st.sidebar.number_input(
            "Enter exact number of rows:", 
            min_value=10, 
            max_value=max_possible, 
            value=min(1000, max_possible), 
            step=100
        )
    
    # Safety Cap: If preset is higher than actual file size
    if dataset_size > max_possible:
        st.sidebar.warning(f"File only has {max_possible} rows. Limiting N to {max_possible}.")
        dataset_size = max_possible
        
    # Complexity Warning
    if dataset_size > 5000 and sort_algo in ["Bubble Sort", "Insertion Sort"]:
        st.sidebar.error(f"⚠️ {sort_algo} is O(N^2). Sorting {dataset_size} rows will be very slow.")

# --- MAIN PAGE ---
st.divider()

if df_original is not None:
    col1, col2 = st.columns([1, 2])
    
    with col1:
        st.subheader("Control Panel")
        st.info(f"Target: Sorting **{dataset_size}** rows by **{sort_col}**")
        
        # UI Note regarding "Stop"
        st.markdown("""
        <div style="background-color: #f0f2f6; padding: 10px; border-radius: 5px; font-size: 12px; color: #333;">
        <b>NOTE:</b> To <b>STOP</b> execution mid-way, press the <b>"Stop" ⏹ button</b> in the top-right corner of the browser tab.
        </div>
        """, unsafe_allow_html=True)
        
        st.write("") # Spacer
        
        if st.button("🚀 START SORTING", type="primary"):
            # Prepare Data Slice
            data_slice = df_original.head(dataset_size).to_dict('records')
            
            bar = st.progress(0, text="Initializing...")
            
            start_time = time.time()
            
            # Run Selected Algorithm
            sorted_data = []
            try:
                if sort_algo == "Bubble Sort":
                    sorted_data = bubble_sort(data_slice, sort_col, bar)
                elif sort_algo == "Insertion Sort":
                    sorted_data = insertion_sort(data_slice, sort_col, bar)
                elif sort_algo == "Merge Sort":
                    sorted_data = merge_sort_wrapper(data_slice, sort_col, bar)
                
                elapsed_time = time.time() - start_time
                
                st.success(f"Sorting Complete! Time: {elapsed_time:.4f} seconds")
                
                st.write("**Top 10 Sorted Records:**")
                st.dataframe(pd.DataFrame(sorted_data).head(10))
                
            except Exception as e:
                st.error(f"An error occurred: {e}")

    with col2:
        st.subheader("Raw Data Preview")
        st.dataframe(df_original.head())

else:
    # Empty State Instructions
    st.markdown("""
    ### 👋 Welcome to the Sorting Stress Test
    
    To proceed, please **upload a CSV file** using the sidebar on the left.
    
    **Your CSV should ideally have:**
    * Headers (e.g., `ID`, `FirstName`, `LastName`)
    * Structured data for sorting
    """)