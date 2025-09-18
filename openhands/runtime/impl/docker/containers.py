import docker
import time
from openhands.core.logger import openhands_logger as logger


def stop_all_containers(prefix: str) -> None:
    docker_client = docker.from_env()
    try:
        containers = docker_client.containers.list(all=True)
        for container in containers:
            try:
                if container.name.startswith(prefix):
                    _stop_container_with_process_cleanup(container)
            except docker.errors.APIError:
                pass
            except docker.errors.NotFound:
                pass
    except docker.errors.NotFound:  # yes, this can happen!
        pass
    finally:
        docker_client.close()


def _stop_container_with_process_cleanup(container) -> None:
    """Stop container with thorough process cleanup to prevent zombie processes."""
    try:
        container.reload()  # Get latest status
        if container.status not in ['running', 'paused']:
            return
            
        container_name = container.name
        logger.info(f"Stopping container {container_name} with process cleanup")
        
        # Step 1: Try to cleanup micromamba/poetry processes inside container
        try:
            # Kill all micromamba processes first
            container.exec_run(
                'pkill -f micromamba || true', 
                detach=True, 
                privileged=True
            )
            # Kill all poetry processes
            container.exec_run(
                'pkill -f poetry || true', 
                detach=True, 
                privileged=True
            )
            # Kill all python processes from our action server
            container.exec_run(
                'pkill -f "action_execution_server" || true', 
                detach=True, 
                privileged=True
            )
            time.sleep(1)  # Give processes time to clean up
        except Exception as e:
            logger.warning(f"Failed to cleanup processes in container {container_name}: {e}")
        
        # Step 2: Graceful stop with timeout
        container.stop(timeout=5)
        
        # Step 3: Check if still running and force kill
        container.reload()
        if container.status == 'running':
            logger.warning(f"Container {container_name} still running after stop, force killing")
            container.kill()
            time.sleep(1)
            
        # Step 4: Final verification
        container.reload()
        if container.status == 'running':
            logger.error(f"Container {container_name} still running after kill!")
        else:
            logger.info(f"Container {container_name} successfully stopped")
            
    except Exception as e:
        logger.error(f"Error stopping container: {e}")
        # Fallback: just try to kill it
        try:
            container.kill()
        except:
            pass
