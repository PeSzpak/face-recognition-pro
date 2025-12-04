"""
TensorFlow Keras compatibility layer.
Ensures tensorflow.keras is properly accessible for DeepFace and other libraries.
"""
import sys
import logging

logger = logging.getLogger(__name__)


def patch_tensorflow_keras():
    """
    Ensure tensorflow.keras is properly accessible.
    TensorFlow 2.15+ has Keras built-in, so we just verify it's accessible.
    """
    try:
        import tensorflow as tf
        
        # TensorFlow 2.15+ already has keras built-in
        if hasattr(tf, 'keras'):
            logger.info("✓ tensorflow.keras already available")
            
            # Ensure submodules are also accessible in sys.modules
            if 'tensorflow.keras' not in sys.modules:
                sys.modules['tensorflow.keras'] = tf.keras  # type: ignore
            if 'tensorflow.keras.layers' not in sys.modules:
                sys.modules['tensorflow.keras.layers'] = tf.keras.layers  # type: ignore
            if 'tensorflow.keras.models' not in sys.modules:
                sys.modules['tensorflow.keras.models'] = tf.keras.models  # type: ignore
            
            logger.info("✓ TensorFlow Keras compatibility verified")
            return True
        else:
            logger.error("✗ tensorflow.keras not found in TensorFlow installation")
            return False
        
    except ImportError as e:
        logger.error(f"✗ Failed to import TensorFlow: {e}")
        return False
    except Exception as e:
        logger.error(f"✗ Unexpected error: {e}")
        return False


# Auto-patch on import
patch_tensorflow_keras()
