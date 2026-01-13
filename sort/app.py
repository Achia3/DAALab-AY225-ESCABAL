import streamlit as st
import time
import pandas as pd


# -----------------------------------------------------------------------------
# Sorting Algorithms
# -----------------------------------------------------------------------------


def bubble_sort(arr):
    arr = arr.copy()
    n = len(arr)
    # Optimization: Check if swapped to exit early
    for i in range(n - 1):
        swapped = False
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
                swapped = True
        if not swapped:
            break
    return arr


def insertion_sort(arr):
    arr = arr.copy()
    for i in range(1, len(arr)):
        key = arr[i]
        j = i - 1
        while j >= 0 and key < arr[j]:
            arr[j + 1] = arr[j]
            j -= 1
        arr[j + 1] = key
    return arr


def merge_sort(arr):
    if len(arr) <= 1:
        return arr

    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])

    return merge(left, right)


def merge(left, right):
    sorted_list = []
    i = j = 0

    while i < len(left) and j < len(right):
        if left[i] < right[j]:
            sorted_list.append(left[i])
            i += 1
        else:
            sorted_list.append(right[j])
            j += 1

    sorted_list.extend(left[i:])
    sorted_list.extend(right[j:])
    return sorted_list


# -----------------------------------------------------------------------------
# Streamlit UI
# -----------------------------------------------------------------------------


def main():
    st.set_page_config(
        page_title="Number Sorter",
        page_icon="🔢",
        layout="centered"
    )

    st.title("🔢 Number Sorting App")
    st.markdown("Upload a .txt file (one number per line).")
    st.divider()

    with st.sidebar:
        st.header("Settings")
        algorithm = st.radio(
            "Select Algorithm",
            ("Bubble Sort", "Insertion Sort", "Merge Sort"),
            index=0
        )
        st.info(f"Algorithm: **{algorithm}**")

    uploaded_file = st.file_uploader("Upload .txt file", type=['txt'])

    if uploaded_file is not None:
        try:
            # -----------------------------------------------------------
            # SMART ENCODING DETECTION
            # -----------------------------------------------------------
            bytes_data = uploaded_file.getvalue()

            # If we see null bytes, it's likely UTF-16
            if b'\x00' in bytes_data:
                try:
                    # Try UTF-16 Little Endian (Windows default)
                    string_data = bytes_data.decode('utf-16')
                except UnicodeDecodeError:
                    # Fallback: UTF-8 ignoring errors, strip nulls
                    string_data = bytes_data.decode('utf-8', errors='ignore').replace('\x00', '')
            else:
                string_data = bytes_data.decode('utf-8', errors='ignore')

            # PURE LINE-BASED PARSING: 1 non-empty line -> 1 number (if numeric)
            numbers = []
            raw_lines = string_data.splitlines()

            for line in raw_lines:
                clean_line = line.strip()

                # Skip only truly empty lines
                if clean_line == "":
                    continue

                try:
                    val = float(clean_line)
                    # Keep integers as int, others as float
                    if val.is_integer():
                        val = int(val)
                    else:
                        val = float(val)
                    numbers.append(val)
                except ValueError:
                    # Non-numeric line: skip
                    continue

            # NO DEDUP, NO LIMITING – numbers list mirrors numeric lines in the file
            if not numbers:
                st.error("No valid numbers found. Check file format.")
                return

            # Stats
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("Total Count", len(numbers))
            with col2:
                st.metric("Min Value", min(numbers))
            with col3:
                st.metric("Max Value", max(numbers))

            # Debug: raw vs parsed counts
            with st.expander("🔍 Debug: Raw & Parsed (no dedup, no limits)"):
                st.write(f"Total raw lines: {len(raw_lines)}")
                st.write(f"Total parsed numbers: {len(numbers)}")
                st.write("First 50 raw lines:")
                st.write(raw_lines[:50])
                st.write("First 50 parsed numbers:")
                st.write(numbers[:50])

            # Sort
            if st.button("Sort Numbers", type="primary", use_container_width=True):
                with st.spinner(f"Sorting {len(numbers)} numbers with {algorithm}..."):
                    start_time = time.time()

                    if algorithm == "Bubble Sort":
                        sorted_arr = bubble_sort(numbers)
                    elif algorithm == "Insertion Sort":
                        sorted_arr = insertion_sort(numbers)
                    else:
                        sorted_arr = merge_sort(numbers)

                    duration = time.time() - start_time

                st.success(f"Done in {duration:.4f} seconds!")

                tab1, tab2 = st.tabs(["Visualization", "Sorted List"])

                with tab1:
                    # Downsample for safety
                    if len(sorted_arr) > 5000:
                        step = max(1, len(sorted_arr) // 5000)
                        st.line_chart(sorted_arr[::step])
                    else:
                        st.line_chart(sorted_arr)

                with tab2:
                    # Use dataframe for speed
                    st.dataframe(
                        pd.DataFrame(sorted_arr, columns=["Sorted Numbers"]),
                        use_container_width=True,
                        height=400
                    )

                    # Download
                    sorted_str = "\n".join(map(str, sorted_arr))
                    st.download_button("Download Result", sorted_str, "sorted.txt")

        except Exception as e:
            st.error(f"Error: {e}")

    else:
        st.info("Waiting for file...")


if __name__ == "__main__":
    main()
