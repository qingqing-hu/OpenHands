#!/usr/bin/env python3
"""
Test script for Claudable integration with OpenHands runtime containers
"""
import os
import sys
import docker
import tarfile
import io

# Add the OpenHands modules to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

def test_claudable_installation():
    """Test the Claudable installation process"""
    print("🔧 Testing Claudable integration...")
    
    # Initialize Docker client
    docker_client = docker.from_env()
    
    try:
        # Get the existing container
        container_name = "f19eaaeda429"  # The container we used for manual testing
        container = docker_client.containers.get(container_name)
        print(f"✅ Found container: {container_name}")
        
        # Check if Claudable is already running
        result = container.exec_run('ps aux | grep claudable', user='root')
        if 'claudable' in result.output.decode().lower():
            print("⚠️  Claudable services are already running - stopping them first")
            # Kill existing processes
            container.exec_run('pkill -f "claudable"', user='root')
            container.exec_run('pkill -f "uvicorn"', user='root')
            container.exec_run('pkill -f "npm run dev"', user='root')
        
        # Prepare the integration archive
        integration_path = os.path.join(os.path.dirname(__file__), 'claudable-integration')
        
        if not os.path.exists(integration_path):
            print(f"❌ Integration path not found: {integration_path}")
            return False
            
        print(f"📦 Creating archive from: {integration_path}")
        tar_stream = io.BytesIO()
        with tarfile.open(mode='w', fileobj=tar_stream) as tar:
            file_count = 0
            for root, dirs, files in os.walk(integration_path):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.join('claudable-integration', os.path.relpath(file_path, integration_path))
                    tar.add(file_path, arcname=arcname)
                    file_count += 1
            print(f"📦 Archive created with {file_count} files")
        tar_stream.seek(0)
        
        # Copy to container
        print("📤 Copying archive to container...")
        container.put_archive('/tmp', tar_stream)
        
        # Verify files copied
        result = container.exec_run('ls -la /tmp/claudable-integration/', user='root')
        if result.exit_code == 0:
            print("✅ Files copied successfully:")
            print(result.output.decode())
        else:
            print(f"❌ Failed to verify files: {result.output.decode()}")
            return False
        
        # Set environment variables for installation
        env_vars = {
            'DEBIAN_FRONTEND': 'noninteractive',
            'APP_PORT_1': '50396',
            'APP_PORT_2': '57023',
            'ANTHROPIC_API_KEY': os.getenv('ANTHROPIC_API_KEY', ''),
            'ANTHROPIC_AUTH_TOKEN': os.getenv('ANTHROPIC_AUTH_TOKEN', '')
        }
        
        # Execute installation script
        print("🚀 Running installation script...")
        result = container.exec_run(
            'bash /tmp/claudable-integration/install-claudable-runtime.sh',
            user='root',
            environment=env_vars
        )
        
        print("📋 Installation output:")
        print(result.output.decode())
        
        if result.exit_code == 0:
            print("✅ Claudable installation completed successfully!")
            
            # Verify services are running
            print("🔍 Verifying services...")
            
            # Check API health
            import time
            time.sleep(5)  # Wait a bit for services to start
            
            api_check = container.exec_run('curl -s http://localhost:50396/health', user='root')
            if api_check.exit_code == 0 and 'ok' in api_check.output.decode():
                print("✅ API service is healthy")
            else:
                print(f"⚠️  API service check: {api_check.output.decode()}")
            
            web_check = container.exec_run('curl -s -I http://localhost:57023', user='root')
            if web_check.exit_code == 0:
                print("✅ Web service is responding")
            else:
                print(f"⚠️  Web service check: {web_check.output.decode()}")
                
            return True
        else:
            print(f"❌ Installation failed with exit code {result.exit_code}")
            return False
            
    except docker.errors.NotFound:
        print(f"❌ Container {container_name} not found")
        return False
    except Exception as e:
        print(f"❌ Error during testing: {e}")
        return False
    finally:
        # Clean up
        try:
            container.exec_run('rm -rf /tmp/claudable-integration', user='root')
            print("🧹 Cleaned up installation files")
        except:
            pass
        docker_client.close()

if __name__ == "__main__":
    success = test_claudable_installation()
    sys.exit(0 if success else 1)