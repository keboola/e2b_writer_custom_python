#!/usr/bin/env python3
"""
e2b Writer - Main Entry Point
This script creates an e2b sandbox and demonstrates basic functionality.
"""

import os
import sys
from e2b_code_interpreter import Sandbox

def main():
    """Main execution function"""

    # Load e2b API key from environment variable
    api_key = os.environ.get('E2B_API_KEY')

    if not api_key:
        print("ERROR: E2B_API_KEY environment variable is not set!")
        print("Please set it with: export E2B_API_KEY='your-api-key-here'")
        sys.exit(1)

    print("=" * 60)
    print("e2b Writer - Sandbox Test")
    print("=" * 60)
    print(f"API Key loaded: {api_key[:8]}..." if len(api_key) > 8 else "***")
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
