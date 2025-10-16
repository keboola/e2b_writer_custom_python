#!/usr/bin/env python3
"""
e2b Writer - Main Entry Point
This script creates an e2b sandbox and demonstrates basic functionality.
Supports both Keboola (user parameters) and local testing (environment variables).
"""

import os
import sys
from e2b_code_interpreter import Sandbox

def get_api_key():
    """
    Get e2b API key from either Keboola user parameters or environment variable.

    Priority:
    1. Keboola user parameters (#e2b_api_key) - for production use
    2. Environment variable (E2B_API_KEY) - for local testing

    Returns:
        tuple: (api_key, mode) where mode is 'keboola' or 'local'
    """
    # Try Keboola mode first
    try:
        from keboola.component import CommonInterface

        ci = CommonInterface()
        parameters = ci.configuration.parameters

        # Debug: Print all available parameters (hiding sensitive values)
        print(f"DEBUG: Available parameter keys: {list(parameters.keys())}")

        # Try different possible keys for the API key
        # Keboola may store it as '#e2b_api_key' or 'e2b_api_key' depending on encryption
        possible_keys = ['#e2b_api_key', 'e2b_api_key']

        for key in possible_keys:
            if key in parameters:
                api_key = parameters[key]
                print(f"DEBUG: Found key '{key}', value length: {len(api_key) if api_key else 0}")

                if api_key and api_key.strip():
                    print(f"✓ Running in Keboola mode (using parameter key: {key})")
                    return api_key, 'keboola'
                else:
                    print(f"WARNING: Key '{key}' found but value is empty")

        # If we got here, CommonInterface loaded but no API key found
        print("WARNING: Running in Keboola but e2b_api_key not found in user parameters")
        print(f"DEBUG: Checked keys: {possible_keys}")

    except ImportError:
        # CommonInterface not available - we're in local testing mode
        print("ℹ Running in local testing mode (CommonInterface not available)")
        pass
    except Exception as e:
        print(f"WARNING: Error loading Keboola configuration: {e}")
        import traceback
        traceback.print_exc()

    # Fall back to environment variable (local testing mode)
    api_key = os.environ.get('E2B_API_KEY')

    if not api_key:
        print("\nERROR: e2b API key not found!")
        print("\nFor Keboola:")
        print("  Set '#e2b_api_key' in User Parameters via the Chrome extension")
        print("\nFor local testing:")
        print("  export E2B_API_KEY='your-api-key-here'")
        sys.exit(1)

    print("✓ Using E2B_API_KEY from environment variable")
    return api_key, 'local'

def main():
    """Main execution function"""

    print("=" * 60)
    print("e2b Writer - Sandbox Test")
    print("=" * 60)

    # Get API key from Keboola user parameters or environment variable
    api_key, mode = get_api_key()

    print(f"Mode: {mode}")
    print(f"API Key: {api_key[:8]}..." if len(api_key) > 8 else "API Key: ***")
    print()

    try:
        # Create sandbox (API key is read from E2B_API_KEY environment variable)
        print("Creating e2b sandbox...")
        sandbox = Sandbox.create()
        print(f"✓ Sandbox created successfully!")
        print(f"  Sandbox ID: {sandbox.sandbox_id}")
        print()

        try:
            # Test 1: Run simple Python code
            print("Test 1: Running simple Python code...")
            execution = sandbox.run_code("print('Hello from e2b sandbox!')")
            stdout = ''.join(execution.logs.stdout)
            print(f"  Output: {stdout.strip()}")
            print()

            # Test 2: Install a package and use it
            print("Test 2: Installing and using pandas...")
            execution = sandbox.run_code("""
import pandas as pd
df = pd.DataFrame({'name': ['Alice', 'Bob'], 'age': [25, 30]})
print(df)
print(f"\\nDataFrame shape: {df.shape}")
""")
            stdout = ''.join(execution.logs.stdout)
            print(f"  Output:")
            print(f"  {stdout}")
            print()

            # Test 3: File operations
            print("Test 3: Creating and reading a file...")
            execution = sandbox.run_code("""
with open('/tmp/test.txt', 'w') as f:
    f.write('Hello from e2b file system!')

with open('/tmp/test.txt', 'r') as f:
    content = f.read()
    print(f"File content: {content}")
""")
            stdout = ''.join(execution.logs.stdout)
            print(f"  Output: {stdout.strip()}")
            print()

            # Test 4: List files in sandbox
            print("Test 4: Listing files in /tmp...")
            execution = sandbox.run_code("""
import os
files = os.listdir('/tmp')
print(f"Files in /tmp: {files}")
""")
            stdout = ''.join(execution.logs.stdout)
            print(f"  Output: {stdout.strip()}")
            print()

            print("=" * 60)
            print("✓ All tests completed successfully!")
            print("=" * 60)

        finally:
            # Clean up sandbox
            print("\nCleaning up sandbox...")
            sandbox.kill()
            print("✓ Sandbox terminated")

    except Exception as e:
        print(f"\n❌ Error occurred: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
