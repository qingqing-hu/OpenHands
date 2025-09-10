import os

<<<<<<< /Users/yddyf/Documents/code/openhands8/OpenHands-main-3/openhands/experiments/experiment_manager.py
||||||| /tmp/source-analysis/OpenHands-main/openhands/experiments/experiment_manager.py
from pydantic import BaseModel

from openhands.core.config.openhands_config import OpenHandsConfig
from openhands.core.logger import openhands_logger as logger
=======
from openhands.core.config.agent_config import AgentConfig
from openhands.core.logger import openhands_logger as logger
>>>>>>> /tmp/colleague-analysis/colleague-code/openhands/experiments/experiment_manager.py
from openhands.server.session.conversation_init_data import ConversationInitData
from openhands.utils.import_utils import get_impl


class ExperimentManager:
    @staticmethod
    def run_conversation_variant_test(
        user_id: str, conversation_id: str, conversation_settings: ConversationInitData
    ) -> ConversationInitData:
        return conversation_settings

<<<<<<< /Users/yddyf/Documents/code/openhands8/OpenHands-main-3/openhands/experiments/experiment_manager.py
||||||| /tmp/source-analysis/OpenHands-main/openhands/experiments/experiment_manager.py
    @staticmethod
    def run_config_variant_test(
        user_id: str | None, conversation_id: str, config: OpenHandsConfig
    ) -> OpenHandsConfig:
        exp_config = load_experiment_config(conversation_id)
        if exp_config and exp_config.config:
            agent_cfg = config.get_agent_config(config.default_agent)
            try:
                for attr, value in exp_config.config.items():
                    if hasattr(agent_cfg, attr):
                        logger.info(
                            f'Set attrib {attr} to {value} for {conversation_id}'
                        )
                        setattr(agent_cfg, attr, value)
            except Exception as e:
                logger.warning(f'Error processing exp config: {e}')

        return config

=======
    @staticmethod
    def run_agent_config_variant_test(
        user_id: str, conversation_id: str, agent_config: AgentConfig
    ) -> AgentConfig:
        logger.debug(
            f'Running agent config variant test for user_id={user_id}, conversation_id={conversation_id}'
        )
        return agent_config

>>>>>>> /tmp/colleague-analysis/colleague-code/openhands/experiments/experiment_manager.py

experiment_manager_cls = os.environ.get(
    'OPENHANDS_EXPERIMENT_MANAGER_CLS',
    'openhands.experiments.experiment_manager.ExperimentManager',
)
ExperimentManagerImpl = get_impl(ExperimentManager, experiment_manager_cls)
