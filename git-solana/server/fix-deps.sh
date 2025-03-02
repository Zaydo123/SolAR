#\!/bin/bash

# Create CRACO config file
cat > /Users/shauryaiyer/SolAR/SolAR/website/SolARexplorer_bundle/craco.config.js << "EOL"
module.exports = {
  webpack: {
    configure: webpackConfig => {
      const scopePluginIndex = webpackConfig.resolve.plugins.findIndex(
        ({ constructor }) => constructor && constructor.name === "ModuleScopePlugin"
      );
      webpackConfig.resolve.plugins.splice(scopePluginIndex, 1);
      return webpackConfig;
    }
  }
};
EOL

# Install CRACO
cd /Users/shauryaiyer/SolAR/SolAR/website/SolARexplorer_bundle && npm install @craco/craco --save-dev

# Update package.json scripts
sed -i "" "s/\"start\": \"react-scripts start\"/\"start\": \"craco start\"/" /Users/shauryaiyer/SolAR/SolAR/website/SolARexplorer_bundle/package.json
sed -i "" "s/\"build\": \"react-scripts build\"/\"build\": \"craco build\"/" /Users/shauryaiyer/SolAR/SolAR/website/SolARexplorer_bundle/package.json
sed -i "" "s/\"test\": \"react-scripts test\"/\"test\": \"craco test\"/" /Users/shauryaiyer/SolAR/SolAR/website/SolARexplorer_bundle/package.json

echo "Fix completed\! Run your app with npm start in the SolARexplorer_bundle directory"

