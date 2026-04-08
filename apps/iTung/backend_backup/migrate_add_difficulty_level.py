#!/usr/bin/env python3
"""
Migration script to add difficulty_level column to quiz_sessions table.
Run this script to update your database schema.
"""

import time
import sys
from sqlalchemy import text
from database import engine

def migrate():
    """Add difficulty_level column to quiz_sessions table if it doesn't exist."""
    max_retries = 5
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            with engine.connect() as connection:
                # Check if column already exists
                result = connection.execute(text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name='quiz_sessions' 
                    AND column_name='difficulty_level'
                """))
                
                if result.fetchone():
                    print("✓ Column 'difficulty_level' already exists in quiz_sessions table")
                    return True
                
                # Add the column
                connection.execute(text("""
                    ALTER TABLE quiz_sessions 
                    ADD COLUMN difficulty_level VARCHAR DEFAULT 'adaptif'
                """))
                connection.commit()
                print("✓ Successfully added 'difficulty_level' column to quiz_sessions table")
                return True
                
        except Exception as e:
            retry_count += 1
            if retry_count < max_retries:
                wait_time = 2 ** retry_count  # Exponential backoff: 2, 4, 8, 16 seconds
                print(f"⚠ Database not ready yet (attempt {retry_count}/{max_retries}). Retrying in {wait_time}s...")
                print(f"  Error: {e}")
                time.sleep(wait_time)
            else:
                print(f"✗ Failed to run migration after {max_retries} attempts")
                print(f"  Error: {e}")
                return False
    
    return False

if __name__ == "__main__":
    success = migrate()
    sys.exit(0 if success else 1)
